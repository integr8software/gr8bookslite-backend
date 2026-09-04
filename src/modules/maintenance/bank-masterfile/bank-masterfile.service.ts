import { BadRequestException, Injectable } from '@nestjs/common';
import { AccountNature, ChartAccountLevel, ChartAccountStatus, ChartAccountType } from '@prisma/client';
import { DefaultLimit, DefaultPage } from '../../../common/constants/pagination.constant';
import { MaintenanceTransactionOptions } from '../../../common/constants/transaction.constant';
import { PermissionAction } from '../../../common/enums/permission-action.enum';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { parsePositiveBigIntId } from '../../../common/utils/id.util';
import { cleanCurrencyCode } from '../../../common/utils/string-normalization.util';
import { PrismaService } from '../../../prisma/prisma.service';
import { ChartAccountBankSyncService } from '../chart-of-accounts/services/chart-account-bank-sync.service';
import { mergeAccountGroupTags } from '../chart-of-accounts/utils/system-account-groups.util';
import { CreateBankAccountDto } from './dto/create-bank-account.dto';
import { GetBankAccountListQueryDto } from './dto/get-bank-account-list-query.dto';
import { ImportBankAccountsDto } from './dto/import-bank-accounts.dto';
import { UpdateBankAccountStatusDto } from './dto/update-bank-account-status.dto';
import { UpdateBankAccountDto } from './dto/update-bank-account.dto';
import { mapBankAccountsWithAuditUsers } from './mappers/bank-account.mapper';
import { BankAccountInclude } from './prisma/bank-account.include';
import { BankMasterfileSupportService } from './services/bank-masterfile-support.service';
import {
  buildBankAccountListWhere,
  buildBankAccountOrderBy,
  ensureAtMostOneDefaultImportedBank,
  ensureNoDuplicateImportedAccountCodes,
  ensureNoDuplicateImportedBankAccounts,
  resolveBankAccountName,
  toBankAccountDtoLike,
  toCreateBankAccountData,
  toUpdateBankAccountData,
  validateBankInput,
} from './utils/bank-account-data.util';

import { ensureActiveCompanyAccess, getActiveCompanyId } from '../../../common/utils/module-access.util';
import { ensureModuleAction, getModulePermissions } from '../../../common/utils/module-permissions.util';
import { throwConflictOnPrismaUniqueError } from '../../../common/utils/prisma-error.util';
const CashInBankGroup = 'Cash in Bank';

@Injectable()
export class BankMasterfileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly chartAccountBankSyncService: ChartAccountBankSyncService,
    private readonly support: BankMasterfileSupportService,
  ) {}

  async findAll(user: AuthUser, query: GetBankAccountListQueryDto) {
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);
    ensureModuleAction(user, companyId, 'BM', PermissionAction.VIEW, 'You do not have permission to manage bank masterfile records.');

    const page = query.page ?? DefaultPage;
    const limit = query.limit ?? DefaultLimit;
    const skip = (page - 1) * limit;
    const where = buildBankAccountListWhere(companyId, query);
    const orderBy = buildBankAccountOrderBy(query);

    const [bankAccounts, total, statistics] = await Promise.all([
      this.prisma.bankAccount.findMany({
        where,
        include: BankAccountInclude,
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.bankAccount.count({ where }),
      this.support.getStatistics(companyId),
    ]);

    return {
      bankAccounts: await mapBankAccountsWithAuditUsers(this.prisma, bankAccounts),
      statistics,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
      permissions: getModulePermissions(user, companyId, 'BM', { includeImport: true }),
    };
  }

  async findOptions(user: AuthUser, query: GetBankAccountListQueryDto) {
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);
    const search = query.search?.trim();
    const currencyCode = query.currencyCode ? cleanCurrencyCode(query.currencyCode) : undefined;

    const banks = await this.prisma.bankAccount.findMany({
      where: {
        companyId,
        status: ChartAccountStatus.ACTIVE,
        ...(currencyCode ? { currencyCode: { equals: currencyCode, mode: 'insensitive' } } : {}),
        ...(search
          ? {
              OR: [
                { bankName: { contains: search, mode: 'insensitive' } },
                { branch: { contains: search, mode: 'insensitive' } },
                { accountName: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        bankName: true,
        accountName: true,
        accountNumber: true,
        currencyCode: true,
        status: true,
      },
      orderBy: [{ bankName: 'asc' }, { accountName: 'asc' }, { id: 'asc' }],
    });

    return {
      banks: banks.map((bank) => ({
        id: bank.id.toString(),
        bankName: bank.bankName,
        accountName: bank.accountName,
        maskedAccountNumber: this.maskAccountNumber(bank.accountNumber),
        currencyCode: bank.currencyCode,
        status: bank.status,
      })),
    };
  }

  async getNextAccountCode(user: AuthUser) {
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);
    ensureModuleAction(user, companyId, 'BM', PermissionAction.CREATE, 'You do not have permission to manage bank masterfile records.');

    const cashInBankAccount = await this.support.findCashInBankParentOrThrow(companyId);
    const accountCode = await this.support.generateNextCashInBankAccountCode(companyId, cashInBankAccount.id, cashInBankAccount.accountCode, this.prisma);

    return {
      accountCode,
      parentAccountCode: cashInBankAccount.accountCode,
      parentAccountTitle: cashInBankAccount.accountTitle,
    };
  }

  async findOne(user: AuthUser, id: string) {
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);
    ensureModuleAction(user, companyId, 'BM', PermissionAction.VIEW, 'You do not have permission to manage bank masterfile records.');
    const bankAccount = await this.support.findBankAccountOrThrow(companyId, parsePositiveBigIntId(id));

    return {
      bankAccount: (await mapBankAccountsWithAuditUsers(this.prisma, [bankAccount]))[0],
      permissions: getModulePermissions(user, companyId, 'BM', { includeImport: true }),
    };
  }

  async create(user: AuthUser, dto: CreateBankAccountDto) {
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);
    ensureModuleAction(user, companyId, 'BM', PermissionAction.CREATE, 'You do not have permission to manage bank masterfile records.');
    validateBankInput(dto);

    try {
      const bankAccount = await this.prisma.$transaction(async (tx) => {
        const cashInBankAccount = await this.support.findCashInBankParentOrThrow(companyId, tx);
        const indicatedAccountCode = dto.accountCode?.trim();
        const indicatedAccountName = dto.accountName?.trim();

        let accountCode: string;
        if (indicatedAccountCode) {
          const isTaken = await this.support.isAccountCodeTaken(companyId, indicatedAccountCode, tx);
          if (!isTaken) {
            accountCode = indicatedAccountCode;
          } else {
            accountCode = await this.support.generateNextCashInBankAccountCode(companyId, cashInBankAccount.id, cashInBankAccount.accountCode, tx);
          }
        } else {
          accountCode = await this.support.generateNextCashInBankAccountCode(companyId, cashInBankAccount.id, cashInBankAccount.accountCode, tx);
        }

        const accountName = resolveBankAccountName(dto);
        const requestedStatus = dto.status ?? ChartAccountStatus.ACTIVE;
        await this.support.ensureBankAccountAvailable(companyId, dto);
        const chartAccount = await tx.chartAccount.create({
          data: {
            companyId,
            parentAccountId: cashInBankAccount.id,
            accountCode,
            accountTitle: accountName,
            accountLevel: ChartAccountLevel.SPECIFIC,
            accountType: ChartAccountType.ASSET,
            accountNature: AccountNature.DEBIT,
            accountGroup: mergeAccountGroupTags(CashInBankGroup),
            isPostingAccount: true,
            currencyCode: cleanCurrencyCode(dto.currencyCode),
            status: ChartAccountStatus.INACTIVE,
            deletedAt: new Date(),
            whoCreated: String(user.id),
          },
        });

        if (dto.isDefault === true) {
          await tx.bankAccount.updateMany({
            where: { companyId, isDefault: true },
            data: { isDefault: false },
          });
        }

        const bankAccount = await tx.bankAccount.create({
          data: {
            companyId,
            coaId: chartAccount.id,
            ...toCreateBankAccountData(dto, accountName),
            status: ChartAccountStatus.INACTIVE,
            createdByUserId: user.id,
          },
          include: BankAccountInclude,
        });

        if (requestedStatus !== ChartAccountStatus.ACTIVE) {
          return bankAccount;
        }

        await this.chartAccountBankSyncService.validateLinkedPairOrThrow({
          companyId,
          bankAccount,
          chartAccount,
          tx,
        });

        await tx.chartAccount.update({
          where: { id: chartAccount.id },
          data: { status: ChartAccountStatus.ACTIVE, deletedAt: null },
        });

        return tx.bankAccount.update({
          where: { id: bankAccount.id },
          data: { status: ChartAccountStatus.ACTIVE },
          include: BankAccountInclude,
        });
      }, MaintenanceTransactionOptions);

      const savedAccountCode = bankAccount.coa?.accountCode ?? '';
      const savedAccountTitle = bankAccount.coa?.accountTitle ?? bankAccount.accountName;
      const message = savedAccountCode
        ? `Bank account created successfully. Saved with Account Code - Account Title: ${savedAccountCode} - ${savedAccountTitle}.`
        : 'Bank account created successfully.';

      return {
        message,
        bankAccount: (await mapBankAccountsWithAuditUsers(this.prisma, [bankAccount]))[0],
      };
    } catch (error) {
      throwConflictOnPrismaUniqueError(error, 'This bank masterfile record already exists.');
      throw error;
    }
  }

  async importBankAccounts(user: AuthUser, dto: ImportBankAccountsDto) {
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);
    ensureModuleAction(user, companyId, 'BM', PermissionAction.CREATE, 'You do not have permission to manage bank masterfile records.');

    dto.banks.forEach(validateBankInput);
    ensureNoDuplicateImportedBankAccounts(dto.banks);
    ensureNoDuplicateImportedAccountCodes(dto.banks);
    ensureAtMostOneDefaultImportedBank(dto.banks);
    await this.support.ensureImportedBankAccountsAvailable(companyId, dto.banks);
    await this.support.ensureImportedAccountCodesAvailable(companyId, dto.banks);

    try {
      const bankAccounts = await this.prisma.$transaction(async (tx) => {
        const cashInBankAccount = await this.support.findCashInBankParentOrThrow(companyId, tx);

        if (dto.banks.some((bank) => bank.isDefault === true)) {
          await tx.bankAccount.updateMany({
            where: { companyId, isDefault: true },
            data: { isDefault: false },
          });
        }

        const createdBankAccountIds: bigint[] = [];

        for (const bank of dto.banks) {
          const accountCode = bank.accountCode?.trim()
            ? await this.support.validateManualAccountCode(companyId, bank.accountCode, tx)
            : await this.support.generateNextCashInBankAccountCode(companyId, cashInBankAccount.id, cashInBankAccount.accountCode, tx);
          const accountName = resolveBankAccountName(bank);
          const requestedStatus = bank.status ?? ChartAccountStatus.ACTIVE;
          const chartAccount = await tx.chartAccount.create({
            data: {
              companyId,
              parentAccountId: cashInBankAccount.id,
              accountCode,
              accountTitle: accountName,
              accountLevel: ChartAccountLevel.SPECIFIC,
              accountType: ChartAccountType.ASSET,
              accountNature: AccountNature.DEBIT,
              accountGroup: mergeAccountGroupTags(CashInBankGroup),
              isPostingAccount: true,
              currencyCode: cleanCurrencyCode(bank.currencyCode),
              status: ChartAccountStatus.INACTIVE,
              deletedAt: new Date(),
              whoCreated: String(user.id),
            },
          });
          const bankAccount = await tx.bankAccount.create({
            data: {
              companyId,
              coaId: chartAccount.id,
              ...toCreateBankAccountData(bank, accountName),
              status: ChartAccountStatus.INACTIVE,
              createdByUserId: user.id,
            },
            include: BankAccountInclude,
          });

          if (requestedStatus === ChartAccountStatus.ACTIVE) {
            await this.chartAccountBankSyncService.validateLinkedPairOrThrow({
              companyId,
              bankAccount,
              chartAccount,
              tx,
            });

            await tx.chartAccount.update({
              where: { id: chartAccount.id },
              data: { status: ChartAccountStatus.ACTIVE, deletedAt: null },
            });

            await tx.bankAccount.update({
              where: { id: bankAccount.id },
              data: { status: ChartAccountStatus.ACTIVE },
            });
          }

          createdBankAccountIds.push(bankAccount.id);
        }

        return tx.bankAccount.findMany({
          where: { id: { in: createdBankAccountIds } },
          include: BankAccountInclude,
          orderBy: [{ bankName: 'asc' }, { id: 'asc' }],
        });
      }, MaintenanceTransactionOptions);

      return {
        message: `${bankAccounts.length} bank account${bankAccounts.length === 1 ? '' : 's'} imported successfully.`,
        bankAccounts: await mapBankAccountsWithAuditUsers(this.prisma, bankAccounts),
      };
    } catch (error) {
      throwConflictOnPrismaUniqueError(error, 'This bank masterfile record already exists.');
      throw error;
    }
  }
  async update(user: AuthUser, id: string, dto: UpdateBankAccountDto) {
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);
    ensureModuleAction(user, companyId, 'BM', PermissionAction.UPDATE, 'You do not have permission to manage bank masterfile records.');
    const bankAccountId = parsePositiveBigIntId(id);
    const currentBankAccount = await this.support.findBankAccountOrThrow(companyId, bankAccountId);

    if (dto.accountCode !== undefined) {
      throw new BadRequestException('Account code cannot be changed here.');
    }

    const nextDto = { ...toBankAccountDtoLike(currentBankAccount), ...dto };
    const nextAccountName = resolveBankAccountName(nextDto);
    validateBankInput(nextDto);
    await this.support.ensureBankAccountAvailable(companyId, dto, bankAccountId);

    try {
      const bankAccount = await this.prisma.$transaction(async (tx) => {
        if (dto.isDefault === true) {
          await tx.bankAccount.updateMany({
            where: { companyId, id: { not: bankAccountId }, isDefault: true },
            data: { isDefault: false },
          });
        }

        const updatedBankAccount = await tx.bankAccount.update({
          where: { id: bankAccountId },
          data: {
            ...toUpdateBankAccountData(dto, nextAccountName),
            updatedByUserId: user.id,
          },
          include: BankAccountInclude,
        });

        await tx.chartAccount.update({
          where: { id: updatedBankAccount.coaId },
          data: {
            accountTitle: nextAccountName,
            currencyCode: dto.currencyCode !== undefined ? cleanCurrencyCode(dto.currencyCode) : undefined,
            status: dto.status,
            deletedAt: dto.status === undefined ? undefined : dto.status === ChartAccountStatus.INACTIVE ? new Date() : null,
            whoModified: String(user.id),
          },
        });

        const refreshedBankAccount = await tx.bankAccount.findUniqueOrThrow({
          where: { id: bankAccountId },
          include: BankAccountInclude,
        });

        if (refreshedBankAccount.status === ChartAccountStatus.ACTIVE) {
          await this.chartAccountBankSyncService.validateLinkedPairOrThrow({
            companyId,
            bankAccount: refreshedBankAccount,
            chartAccount: refreshedBankAccount.coa,
            tx,
          });
        }

        return refreshedBankAccount;
      }, MaintenanceTransactionOptions);

      return {
        message: 'Bank account updated successfully.',
        bankAccount: (await mapBankAccountsWithAuditUsers(this.prisma, [bankAccount]))[0],
      };
    } catch (error) {
      throwConflictOnPrismaUniqueError(error, 'This bank masterfile record already exists.');
      throw error;
    }
  }

  async updateStatus(user: AuthUser, id: string, dto: UpdateBankAccountStatusDto) {
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);
    ensureModuleAction(user, companyId, 'BM', PermissionAction.UPDATE, 'You do not have permission to manage bank masterfile records.');
    const bankAccountId = parsePositiveBigIntId(id);
    const currentBankAccount = await this.support.findBankAccountOrThrow(companyId, bankAccountId);

    const bankAccount = await this.prisma.$transaction(async (tx) => {
      if (dto.status === ChartAccountStatus.ACTIVE) {
        await this.chartAccountBankSyncService.validateLinkedPairOrThrow({
          companyId,
          bankAccount: currentBankAccount,
          chartAccount: currentBankAccount.coa,
          tx,
        });
      }

      await tx.chartAccount.update({
        where: { id: currentBankAccount.coaId },
        data: {
          status: dto.status,
          deletedAt: dto.status === ChartAccountStatus.INACTIVE ? new Date() : null,
          whoModified: String(user.id),
        },
      });

      return tx.bankAccount.update({
        where: { id: bankAccountId },
        data: {
          status: dto.status,
          updatedByUserId: user.id,
        },
        include: BankAccountInclude,
      });
    }, MaintenanceTransactionOptions);

    return {
      message: dto.status === ChartAccountStatus.ACTIVE ? 'Bank account activated successfully.' : 'Bank account inactivated successfully.',
      bankAccount: (await mapBankAccountsWithAuditUsers(this.prisma, [bankAccount]))[0],
    };
  }

  private maskAccountNumber(accountNumber: string) {
    const trimmed = accountNumber.trim();
    if (trimmed.length <= 4) {
      return trimmed ? '*'.repeat(trimmed.length) : '';
    }

    return `${'*'.repeat(Math.max(0, trimmed.length - 4))}${trimmed.slice(-4)}`;
  }
}
