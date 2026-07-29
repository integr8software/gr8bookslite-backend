import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { MembershipStatus, Prisma, TaxPostingEvent } from '@prisma/client';
import { AppRole } from '../../common/enums/app-role.enum';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { TaxListQueryDto } from './dto/tax-list-query.dto';
import { mapTax, mapTaxAutocomplete } from './mappers/tax-code.mapper';
import type { TaxCompanyAccountMapping, TaxWithPostingRules } from './types/tax-prisma-payload.type';

const TaxModuleCode = 'TXM';

@Injectable()
export class TaxService {
  constructor(private readonly prisma: PrismaService) {}

  async listTaxes(query: TaxListQueryDto = {}) {
    const taxes = await this.prisma.tax.findMany({
      where: this.buildWhereInput(query),
      orderBy: [
        { transactionType: 'asc' },
        { taxType: 'asc' },
        { sortOrder: 'asc' },
        { taxCode: 'asc' },
        { taxDescription: 'asc' },
      ],
      take: query.limit ?? 20,
    });

    const mappedTaxes = taxes.map(mapTax);

    return {
      taxCodes: mappedTaxes,
      taxes: mappedTaxes,
    };
  }

  async getTax(sourceKey: string) {
    const tax = await this.prisma.tax.findUnique({
      where: {
        sourceKey,
      },
    });

    if (!tax) {
      throw new NotFoundException('Tax not found.');
    }

    const mappedTax = mapTax(tax);

    return {
      tax: mappedTax,
      taxCode: mappedTax,
    };
  }

  async listTaxesWithDefaultAccounts(user: AuthUser, query: TaxListQueryDto = {}) {
    const companyId = this.getActiveCompanyId(user);
    await this.ensureCompanyAccess(user, companyId);

    const taxes = await this.prisma.tax.findMany({
      where: this.buildWhereInput(query),
      include: {
        postingRules: {
          where: {
            isActive: true,
            postingEvent: TaxPostingEvent.RECOGNITION,
          },
          orderBy: [{ transactionScope: 'asc' }, { priority: 'asc' }, { accountRole: 'asc' }],
        },
      },
      orderBy: [
        { transactionType: 'asc' },
        { taxType: 'asc' },
        { sortOrder: 'asc' },
        { taxCode: 'asc' },
        { taxDescription: 'asc' },
      ],
      take: query.limit ?? 20,
    });

    const accountRoles = [...new Set(taxes.flatMap((tax) => tax.postingRules.map((rule) => rule.accountRole)))];
    const accountMappings = await this.findCompanyTaxAccountMappings(companyId, accountRoles);
    const mappedTaxes = taxes.map((tax) => this.mapTaxWithDefaultAccounts(tax, accountMappings));

    return {
      companyId,
      taxCodes: mappedTaxes,
      taxes: mappedTaxes,
    };
  }

  async getTaxWithDefaultAccounts(user: AuthUser, sourceKey: string) {
    const companyId = this.getActiveCompanyId(user);
    await this.ensureCompanyAccess(user, companyId);

    const tax = await this.prisma.tax.findUnique({
      where: {
        sourceKey,
      },
      include: {
        postingRules: {
          where: {
            isActive: true,
            postingEvent: TaxPostingEvent.RECOGNITION,
          },
          orderBy: [{ transactionScope: 'asc' }, { priority: 'asc' }, { accountRole: 'asc' }],
        },
      },
    });

    if (!tax) {
      throw new NotFoundException('Tax not found.');
    }

    const accountMappings = await this.findCompanyTaxAccountMappings(
      companyId,
      tax.postingRules.map((rule) => rule.accountRole),
    );
    const mappedTax = this.mapTaxWithDefaultAccounts(tax, accountMappings);

    return {
      companyId,
      tax: mappedTax,
      taxCode: mappedTax,
    };
  }

  async listAutocomplete(query: TaxListQueryDto = {}) {
    const taxes = await this.prisma.tax.findMany({
      where: this.buildWhereInput(query),
      orderBy: [
        { transactionType: 'asc' },
        { taxType: 'asc' },
        { sortOrder: 'asc' },
        { taxCode: 'asc' },
        { taxDescription: 'asc' },
      ],
      take: query.limit ?? 20,
    });

    const mappedTaxes = taxes.map(mapTaxAutocomplete);

    return {
      taxCodes: mappedTaxes,
      taxes: mappedTaxes,
    };
  }

  async listTransactionTypes() {
    const taxes = await this.prisma.tax.findMany({
      distinct: ['transactionType'],
      orderBy: [{ transactionType: 'asc' }],
      select: {
        transactionType: true,
      },
    });

    return {
      transactionTypes: taxes.map((tax) => tax.transactionType),
    };
  }

  async listTaxTypes() {
    const taxes = await this.prisma.tax.findMany({
      distinct: ['taxType'],
      orderBy: [{ taxType: 'asc' }],
      select: {
        taxType: true,
      },
    });

    return {
      taxTypes: taxes.map((tax) => tax.taxType),
    };
  }

  listPartyDefaultClassifications() {
    return {
      classifications: [
        {
          key: 'defaultPurchaseInputVatTaxSourceKey',
          label: 'Purchase Input VAT',
          transactionType: 'Purchases',
          taxTypes: ['INPUT VAT'],
        },
        {
          key: 'defaultPurchaseEwtTaxSourceKey',
          label: 'Purchase Expanded Withholding Tax',
          transactionType: 'Purchases',
          taxTypes: ['EWT'],
        },
        {
          key: 'defaultPurchaseFwtTaxSourceKey',
          label: 'Purchase Final Withholding Tax',
          transactionType: 'Purchases',
          taxTypes: ['FWT'],
        },
        {
          key: 'defaultPurchaseWvatTaxSourceKey',
          label: 'Purchase VAT Withholding',
          transactionType: 'Purchases',
          taxTypes: ['EWT', 'WVAT'],
          officialAtcCodePrefix: 'WV',
        },
        {
          key: 'defaultSalesOutputVatTaxSourceKey',
          label: 'Sales Output VAT',
          transactionType: 'Sales',
          taxTypes: ['OUTPUT VAT'],
        },
        {
          key: 'defaultSalesCwtTaxSourceKey',
          label: 'Sales Creditable Withholding Tax',
          transactionType: 'Sales',
          taxTypes: ['CWT'],
        },
        {
          key: 'defaultSalesWvatTaxSourceKey',
          label: 'Sales VAT Withholding',
          transactionType: 'Sales',
          taxTypes: ['WVAT'],
        },
      ],
    };
  }

  private async findCompanyTaxAccountMappings(companyId: number, accountRoles: string[]) {
    if (accountRoles.length === 0) {
      return new Map<string, TaxCompanyAccountMapping>();
    }

    const mappings = await this.prisma.companyAccountMapping.findMany({
      where: {
        companyId,
        moduleCode: TaxModuleCode,
        accountRole: {
          in: accountRoles,
        },
      },
      include: {
        chartAccount: true,
      },
    });

    return new Map(mappings.map((mapping) => [mapping.accountRole, mapping]));
  }

  private mapTaxWithDefaultAccounts(tax: TaxWithPostingRules, accountMappings: Map<string, TaxCompanyAccountMapping>) {
    const mappedTax = mapTax(tax);
    const postingAccounts = tax.postingRules.map((rule) => {
      const mapping = accountMappings.get(rule.accountRole);

      return {
        transactionScope: rule.transactionScope,
        postingEvent: rule.postingEvent,
        accountRole: rule.accountRole,
        entrySide: rule.entrySide,
        amountSource: rule.amountSource,
        priority: rule.priority,
        companyAccountMappingId: mapping?.id.toString() ?? null,
        chartAccount: mapping
          ? {
              id: mapping.chartAccount.id.toString(),
              accountCode: mapping.chartAccount.accountCode,
              accountTitle: mapping.chartAccount.accountTitle,
              accountType: mapping.chartAccount.accountType,
              accountNature: mapping.chartAccount.accountNature,
              status: mapping.chartAccount.status,
              isPostingAccount: mapping.chartAccount.isPostingAccount,
            }
          : null,
      };
    });

    return {
      ...mappedTax,
      postingAccounts,
      defaultTaxAccounts: postingAccounts,
    };
  }

  private getActiveCompanyId(user: AuthUser) {
    if (!user.companyId) {
      throw new BadRequestException('Select an active company first.');
    }

    return user.companyId;
  }

  private async ensureCompanyAccess(user: AuthUser, companyId: number) {
    if (user.role === AppRole.SUPER_ADMIN) {
      return;
    }

    const membership = await this.prisma.membership.findUnique({
      where: {
        userId_companyId: {
          userId: user.id,
          companyId,
        },
      },
      select: {
        status: true,
      },
    });

    if (!membership || membership.status === MembershipStatus.REMOVED) {
      throw new NotFoundException('Company not found.');
    }
  }

  private buildWhereInput(query: TaxListQueryDto): Prisma.TaxWhereInput {
    const normalizedQuery = query.query?.trim();
    const status = query.status === 'ALL' ? undefined : (query.status ?? 'ACTIVE');

    return {
      transactionType: query.transactionType,
      taxType: query.taxType,
      taxCode: query.taxCode,
      officialAtcCode: query.officialAtcCode,
      status,
      taxExempt: query.taxExempt,
      OR: normalizedQuery
        ? [
            { sourceKey: { contains: normalizedQuery, mode: 'insensitive' } },
            { transactionType: { contains: normalizedQuery, mode: 'insensitive' } },
            { taxType: { contains: normalizedQuery, mode: 'insensitive' } },
            { taxCode: { contains: normalizedQuery, mode: 'insensitive' } },
            { taxDescription: { contains: normalizedQuery, mode: 'insensitive' } },
            { taxAlias: { contains: normalizedQuery, mode: 'insensitive' } },
            { atc: { contains: normalizedQuery, mode: 'insensitive' } },
            { officialAtcCode: { contains: normalizedQuery, mode: 'insensitive' } },
            { natureOfIncome: { contains: normalizedQuery, mode: 'insensitive' } },
          ]
        : undefined,
    };
  }
}
