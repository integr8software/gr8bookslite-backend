import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AlphanumericTaxCodeListQueryDto } from './dto/alphanumeric-tax-code-list-query.dto';
import { mapAlphanumericTaxCode, mapAlphanumericTaxCodeAutocomplete } from './mappers/alphanumeric-tax-code.mapper';

@Injectable()
export class AlphanumericTaxCodesService {
  constructor(private readonly prisma: PrismaService) {}

  async listTaxCodes(query: AlphanumericTaxCodeListQueryDto = {}) {
    const taxCodes = await this.prisma.alphanumericTaxCode.findMany({
      where: this.buildWhereInput(query),
      orderBy: [{ transactionType: 'asc' }, { taxType: 'asc' }, { taxCode: 'asc' }, { taxDescription: 'asc' }],
      take: query.limit ?? 20,
    });

    return {
      taxCodes: taxCodes.map(mapAlphanumericTaxCode),
    };
  }

  async getTaxCode(sourceKey: string) {
    const taxCode = await this.prisma.alphanumericTaxCode.findUnique({
      where: {
        sourceKey,
      },
    });

    if (!taxCode) {
      throw new NotFoundException('Alphanumeric tax code not found.');
    }

    return {
      taxCode: mapAlphanumericTaxCode(taxCode),
    };
  }

  async listAutocomplete(query: AlphanumericTaxCodeListQueryDto) {
    const taxCodes = await this.prisma.alphanumericTaxCode.findMany({
      where: this.buildWhereInput(query),
      orderBy: [{ transactionType: 'asc' }, { taxType: 'asc' }, { taxCode: 'asc' }, { taxDescription: 'asc' }],
      take: query.limit ?? 20,
    });

    return {
      taxCodes: taxCodes.map(mapAlphanumericTaxCodeAutocomplete),
    };
  }

  async listTransactionTypes() {
    const taxCodes = await this.prisma.alphanumericTaxCode.findMany({
      distinct: ['transactionType'],
      orderBy: [{ transactionType: 'asc' }],
      select: {
        transactionType: true,
      },
    });

    return {
      transactionTypes: taxCodes.map((taxCode) => taxCode.transactionType),
    };
  }

  async listTaxTypes() {
    const taxCodes = await this.prisma.alphanumericTaxCode.findMany({
      distinct: ['taxType'],
      orderBy: [{ taxType: 'asc' }],
      select: {
        taxType: true,
      },
    });

    return {
      taxTypes: taxCodes.map((taxCode) => taxCode.taxType),
    };
  }

  private buildWhereInput(query: AlphanumericTaxCodeListQueryDto): Prisma.AlphanumericTaxCodeWhereInput {
    const normalizedQuery = query.query?.trim();

    return {
      transactionType: query.transactionType,
      taxType: query.taxType,
      taxCode: query.taxCode,
      officialAtcCode: query.officialAtcCode,
      OR: normalizedQuery
        ? [
            { sourceKey: { contains: normalizedQuery, mode: 'insensitive' } },
            {
              transactionType: {
                contains: normalizedQuery,
                mode: 'insensitive',
              },
            },
            { taxType: { contains: normalizedQuery, mode: 'insensitive' } },
            { taxCode: { contains: normalizedQuery, mode: 'insensitive' } },
            {
              taxDescription: {
                contains: normalizedQuery,
                mode: 'insensitive',
              },
            },
            { taxAlias: { contains: normalizedQuery, mode: 'insensitive' } },
            { atc: { contains: normalizedQuery, mode: 'insensitive' } },
            {
              officialAtcCode: {
                contains: normalizedQuery,
                mode: 'insensitive',
              },
            },
            {
              natureOfIncome: {
                contains: normalizedQuery,
                mode: 'insensitive',
              },
            },
          ]
        : undefined,
    };
  }
}
