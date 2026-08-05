import { Injectable } from '@nestjs/common';
import { ChartAccountStatus } from '@prisma/client';
import type { AuthUser } from '../../../../common/interfaces/auth-user.interface';
import { cleanCurrencyCode } from '../../../../common/utils/string-normalization.util';
import { PrismaService } from '../../../../prisma/prisma.service';
import { GetBankAccountListQueryDto } from '../dto/get-bank-account-list-query.dto';

import { ensureActiveCompanyAccess, getActiveCompanyId } from '../../../../common/utils/module-access.util';
@Injectable()
export class BankMasterfileLookupService {
  constructor(private readonly prisma: PrismaService) {}

  async findOptionsForCompanyUser(user: AuthUser, query: Pick<GetBankAccountListQueryDto, 'search' | 'currencyCode'>) {
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);

    return {
      banks: await this.findOptions({
        companyId,
        search: query.search,
        currencyCode: query.currencyCode,
      }),
    };
  }

  async findOptions({ companyId, search, currencyCode }: { companyId: number; search?: string; currencyCode?: string }) {
    const normalizedSearch = search?.trim();
    const normalizedCurrencyCode = currencyCode ? cleanCurrencyCode(currencyCode) : undefined;
    const banks = await this.prisma.bankAccount.findMany({
      where: {
        companyId,
        status: ChartAccountStatus.ACTIVE,
        ...(normalizedCurrencyCode ? { currencyCode: { equals: normalizedCurrencyCode, mode: 'insensitive' } } : {}),
        ...(normalizedSearch
          ? {
              OR: [
                { bankName: { contains: normalizedSearch, mode: 'insensitive' } },
                { branch: { contains: normalizedSearch, mode: 'insensitive' } },
                { accountName: { contains: normalizedSearch, mode: 'insensitive' } },
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

    return banks.map((bank) => ({
      id: bank.id.toString(),
      bankName: bank.bankName,
      accountName: bank.accountName,
      maskedAccountNumber: this.maskAccountNumber(bank.accountNumber),
      currencyCode: bank.currencyCode,
      status: bank.status,
    }));
  }

  private maskAccountNumber(accountNumber: string) {
    const trimmed = accountNumber.trim();
    if (trimmed.length <= 4) {
      return trimmed ? '*'.repeat(trimmed.length) : '';
    }

    return `${'*'.repeat(Math.max(0, trimmed.length - 4))}${trimmed.slice(-4)}`;
  }
}
