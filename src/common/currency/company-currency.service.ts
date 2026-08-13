import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { cleanCurrencyCode } from '../utils/string-normalization.util';
import { PrismaService } from '../../prisma/prisma.service';

type PrismaClientLike = Prisma.TransactionClient | PrismaService;

@Injectable()
export class CompanyCurrencyService {
  constructor(private readonly prisma: PrismaService) {}

  async getBaseCurrencyCode(companyId: number, client: PrismaClientLike = this.prisma) {
    const company = await client.company.findUnique({
      where: { id: companyId },
      select: { baseCurrencyCode: true },
    });

    if (!company) {
      throw new NotFoundException('Company not found.');
    }

    return cleanCurrencyCode(company.baseCurrencyCode) ?? 'PHP';
  }
}
