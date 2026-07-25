import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ChartAccount, ChartAccountStatus, TaxMaintenanceStatus, TaxTransactionScope } from '@prisma/client';
import { PermissionAction } from '../../../common/enums/permission-action.enum';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { parsePositiveBigIntId } from '../../../common/utils/id.util';
import { cleanOptional } from '../../../common/utils/string-normalization.util';
import { PrismaService } from '../../../prisma/prisma.service';
import { TaxModuleCode } from '../constants/tax.constants';
import { UpdateCompanyTaxConfigurationDto } from '../dto/update-company-tax-configuration.dto';
import { UpdateDefaultTaxAccountsDto } from '../dto/update-default-tax-accounts.dto';
import { UpsertTaxAccountMappingDto } from '../dto/upsert-tax-account-mapping.dto';
import { TaxInclude } from '../prisma/tax.include';
import { buildTaxAccountingAccountOptions, TaxDefaultAccountDefinitions, type TaxAccountRole } from '../utils/tax-accounting-account.util';
import { TaxAccessService } from './tax-access.service';

@Injectable()
export class TaxCompanyConfigurationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: TaxAccessService,
  ) {}

  async resolveTaxForTransaction(companyId: number, taxMaintenanceId: bigint, transactionScope: Exclude<TaxTransactionScope, 'BOTH'>) {
    const tax = await this.prisma.taxMaintenance.findFirst({
      where: {
        id: taxMaintenanceId,
        deletedAt: null,
        status: TaxMaintenanceStatus.ACTIVE,
        transactionScope: {
          in: [transactionScope, TaxTransactionScope.BOTH],
        },
      },
      include: TaxInclude,
    });
    if (!tax) {
      throw new BadRequestException('Select an active tax definition that supports this transaction scope.');
    }

    const posting = this.getLegacyTransactionPosting(transactionScope);
    const mapping = await this.prisma.companyAccountMapping.findUnique({
      where: {
        companyId_moduleCode_accountRole: {
          companyId,
          moduleCode: TaxModuleCode,
          accountRole: posting.accountRole,
        },
      },
      include: { chartAccount: true },
    });
    const account = mapping?.chartAccount;
    if (!this.isUsablePostingAccount(account, companyId)) {
      throw new BadRequestException(`Configure the company's ${posting.label} account before posting this transaction.`);
    }

    return {
      ...tax,
      postingAccountRole: posting.accountRole,
      postingSide: posting.side,
      postingAccount: {
        id: account.id,
        code: account.accountCode,
        title: account.accountTitle,
      },
    };
  }

  async getDefaultAccounts(user: AuthUser) {
    const companyId = this.access.getActiveCompanyId(user);
    await this.access.assertCompanyAccess(user, companyId);
    this.access.assertCan(user, PermissionAction.VIEW);
    const accountingOptions = await this.getAccountingOptions(companyId);

    return {
      accounts: this.mapDefaultTaxAccounts(accountingOptions),
      accountOptions: accountingOptions.accountOptions,
      permissions: this.access.getPermissions(user),
    };
  }

  async updateDefaultAccounts(user: AuthUser, dto: UpdateDefaultTaxAccountsDto) {
    const companyId = this.access.getActiveCompanyId(user);
    await this.access.assertCompanyAccess(user, companyId);
    this.access.assertCan(user, PermissionAction.UPDATE);
    this.assertCompleteDefaultAccountRequest(dto);

    const selectedAccountIds = dto.accounts.map(({ accountId }) => parsePositiveBigIntId(accountId, 'accountId'));
    await this.assertAccountsBelongToCompany(companyId, selectedAccountIds);

    const definitionByField = new Map(TaxDefaultAccountDefinitions.map((definition) => [definition.field, definition]));
    await this.prisma.$transaction(
      dto.accounts.map(({ accountId, field }) => {
        const definition = definitionByField.get(field);
        if (!definition) {
          throw new BadRequestException(`Unsupported default tax account field: ${field}.`);
        }
        return this.prisma.companyAccountMapping.upsert({
          where: {
            companyId_moduleCode_accountRole: {
              companyId,
              moduleCode: TaxModuleCode,
              accountRole: definition.role,
            },
          },
          create: {
            companyId,
            moduleCode: TaxModuleCode,
            accountRole: definition.role,
            chartAccountId: BigInt(accountId),
            createdByUserId: user.id,
            updatedByUserId: user.id,
          },
          update: {
            chartAccountId: BigInt(accountId),
            updatedByUserId: user.id,
          },
        });
      }),
    );

    const refreshedOptions = await this.getAccountingOptions(companyId);
    return {
      message: 'Default tax accounts updated successfully.',
      accounts: this.mapDefaultTaxAccounts(refreshedOptions),
      accountOptions: refreshedOptions.accountOptions,
      permissions: this.access.getPermissions(user),
    };
  }

  async upsertAccountMapping(user: AuthUser, dto: UpsertTaxAccountMappingDto) {
    const companyId = this.access.getActiveCompanyId(user);
    await this.access.assertCompanyAccess(user, companyId);
    this.access.assertCan(user, PermissionAction.UPDATE);

    const [postingRule, account] = await Promise.all([
      this.prisma.taxPostingRule.findFirst({
        where: { accountRole: dto.accountRole, isActive: true },
        select: { id: true },
      }),
      this.prisma.chartAccount.findFirst({
        where: {
          id: parsePositiveBigIntId(dto.accountId, 'accountId'),
          companyId,
          status: ChartAccountStatus.ACTIVE,
          deletedAt: null,
          isPostingAccount: true,
        },
      }),
    ]);
    if (!postingRule) {
      throw new BadRequestException('The account role is not used by an active tax posting rule.');
    }
    if (!account) {
      throw new BadRequestException('Select an active posting account from this company.');
    }

    await this.prisma.companyAccountMapping.upsert({
      where: {
        companyId_moduleCode_accountRole: {
          companyId,
          moduleCode: TaxModuleCode,
          accountRole: dto.accountRole,
        },
      },
      update: {
        chartAccountId: account.id,
        updatedByUserId: user.id,
      },
      create: {
        companyId,
        moduleCode: TaxModuleCode,
        accountRole: dto.accountRole,
        chartAccountId: account.id,
        createdByUserId: user.id,
        updatedByUserId: user.id,
      },
    });

    return {
      message: 'Company tax account mapping saved successfully.',
      mapping: {
        accountRole: dto.accountRole,
        accountId: account.id.toString(),
        accountCode: account.accountCode,
        accountTitle: account.accountTitle,
      },
    };
  }

  async updateCompanyConfiguration(user: AuthUser, id: string, dto: UpdateCompanyTaxConfigurationDto) {
    const companyId = this.access.getActiveCompanyId(user);
    await this.access.assertCompanyAccess(user, companyId);
    this.access.assertCan(user, PermissionAction.UPDATE);
    const taxId = parsePositiveBigIntId(id);
    await this.assertTaxExists(taxId);

    const configuration = await this.prisma.$transaction(async (tx) => {
      if (dto.isDefaultForSales) {
        await tx.companyTaxConfiguration.updateMany({
          where: {
            companyId,
            isDefaultForSales: true,
            taxDefinitionId: { not: taxId },
          },
          data: { isDefaultForSales: false },
        });
      }
      if (dto.isDefaultForPurchases) {
        await tx.companyTaxConfiguration.updateMany({
          where: {
            companyId,
            isDefaultForPurchases: true,
            taxDefinitionId: { not: taxId },
          },
          data: { isDefaultForPurchases: false },
        });
      }

      return tx.companyTaxConfiguration.upsert({
        where: {
          companyId_taxDefinitionId: {
            companyId,
            taxDefinitionId: taxId,
          },
        },
        update: {
          ...(dto.isEnabled !== undefined ? { isEnabled: dto.isEnabled } : {}),
          ...(dto.isDefaultForSales !== undefined ? { isDefaultForSales: dto.isDefaultForSales } : {}),
          ...(dto.isDefaultForPurchases !== undefined ? { isDefaultForPurchases: dto.isDefaultForPurchases } : {}),
          ...(dto.registrationNumber !== undefined
            ? {
                registrationNumber: cleanOptional(dto.registrationNumber),
              }
            : {}),
        },
        create: {
          companyId,
          taxDefinitionId: taxId,
          isEnabled: dto.isEnabled ?? true,
          isDefaultForSales: dto.isDefaultForSales ?? false,
          isDefaultForPurchases: dto.isDefaultForPurchases ?? false,
          registrationNumber: cleanOptional(dto.registrationNumber),
        },
      });
    });

    return {
      message: 'Company tax configuration updated successfully.',
      configuration: {
        ...configuration,
        id: configuration.id.toString(),
        taxDefinitionId: configuration.taxDefinitionId.toString(),
      },
    };
  }

  getEmptyAccountingOptions() {
    return buildTaxAccountingAccountOptions([]);
  }

  async getAccountingOptions(companyId: number) {
    const [accounts, mappings] = await Promise.all([
      this.prisma.chartAccount.findMany({
        where: {
          companyId,
          status: ChartAccountStatus.ACTIVE,
          deletedAt: null,
          isPostingAccount: true,
        },
        orderBy: [{ accountCode: 'asc' }, { orderNo: 'asc' }, { accountTitle: 'asc' }],
      }),
      this.prisma.companyAccountMapping.findMany({
        where: {
          companyId,
          moduleCode: TaxModuleCode,
          accountRole: {
            in: TaxDefaultAccountDefinitions.map(({ role }) => role),
          },
        },
        select: { accountRole: true, chartAccountId: true },
      }),
    ]);
    const configuredAccountIds = Object.fromEntries(mappings.map(({ accountRole, chartAccountId }) => [accountRole, chartAccountId.toString()])) as Partial<
      Record<TaxAccountRole, string>
    >;

    return buildTaxAccountingAccountOptions(accounts, configuredAccountIds);
  }

  private assertCompleteDefaultAccountRequest(dto: UpdateDefaultTaxAccountsDto) {
    const requestedFields = dto.accounts.map(({ field }) => field);
    if (new Set(requestedFields).size !== requestedFields.length) {
      throw new BadRequestException('Each default tax account may only be submitted once.');
    }
    const expectedFields = TaxDefaultAccountDefinitions.map(({ field }) => field);
    const missingFields = expectedFields.filter((field) => !requestedFields.includes(field));
    if (missingFields.length > 0 || dto.accounts.length !== expectedFields.length) {
      throw new BadRequestException('Select an account for every default tax posting role.');
    }
  }

  private async assertAccountsBelongToCompany(companyId: number, accountIds: bigint[]) {
    const accounts = await this.prisma.chartAccount.findMany({
      where: {
        id: { in: accountIds },
        companyId,
        status: ChartAccountStatus.ACTIVE,
        deletedAt: null,
        isPostingAccount: true,
      },
      select: { id: true },
    });
    const existingIds = new Set(accounts.map(({ id }) => id.toString()));
    if (accountIds.some((id) => !existingIds.has(id.toString()))) {
      throw new BadRequestException('Every default tax account must be an active posting account from this company.');
    }
  }

  private mapDefaultTaxAccounts(accountingOptions: Awaited<ReturnType<TaxCompanyConfigurationService['getAccountingOptions']>>) {
    return TaxDefaultAccountDefinitions.map(({ field, label, role }) => {
      const accountId = accountingOptions.defaultAccountIds[field];
      const account = accountingOptions.accountOptions.find((option) => option.id === accountId);
      return {
        field,
        role,
        label,
        accountId,
        accountCode: account?.accountNumber ?? '',
        accountTitle: account?.accountName ?? '',
        isConfigured: Boolean(account),
      };
    });
  }

  private isUsablePostingAccount(account: ChartAccount | null | undefined, companyId: number): account is ChartAccount {
    return Boolean(
      account && account.companyId === companyId && account.status === ChartAccountStatus.ACTIVE && account.deletedAt === null && account.isPostingAccount,
    );
  }

  private getLegacyTransactionPosting(transactionScope: Exclude<TaxTransactionScope, 'BOTH'>) {
    return transactionScope === TaxTransactionScope.PURCHASE
      ? {
          accountRole: 'INPUT_TAX_ACCOUNT' as const,
          label: 'Input VAT',
          side: 'DEBIT' as const,
        }
      : {
          accountRole: 'OUTPUT_VAT_ACCOUNT' as const,
          label: 'Output VAT',
          side: 'CREDIT' as const,
        };
  }

  private async assertTaxExists(taxId: bigint) {
    const tax = await this.prisma.taxMaintenance.findFirst({
      where: { id: taxId, deletedAt: null },
      select: { id: true },
    });
    if (!tax) {
      throw new NotFoundException('Tax record not found.');
    }
  }
}
