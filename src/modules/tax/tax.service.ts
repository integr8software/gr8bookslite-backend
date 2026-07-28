import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { TaxListQueryDto } from './dto/tax-list-query.dto';
import { mapTax, mapTaxAutocomplete } from './mappers/tax-code.mapper';

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

  private buildWhereInput(query: TaxListQueryDto): Prisma.TaxWhereInput {
    const normalizedQuery = query.query?.trim();

    return {
      transactionType: query.transactionType,
      taxType: query.taxType,
      taxCode: query.taxCode,
      officialAtcCode: query.officialAtcCode,
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
