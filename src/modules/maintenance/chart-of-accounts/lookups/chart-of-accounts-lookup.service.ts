import { Injectable } from '@nestjs/common';
import { ChartAccountStatus } from '@prisma/client';
import type { AuthUser } from '../../../../common/interfaces/auth-user.interface';
import { parseOptionalPositiveBigIntIdOrUndefined } from '../../../../common/utils/id.util';
import { PrismaService } from '../../../../prisma/prisma.service';
import { GetChartAccountListQueryDto } from '../dto/get-chart-account-list-query.dto';

import { ensureActiveCompanyAccess, getActiveCompanyId } from '../../../../common/utils/module-access.util';
@Injectable()
export class ChartOfAccountsLookupService {
  constructor(private readonly prisma: PrismaService) {}

  async findOptionsForCompanyUser(user: AuthUser, query: GetChartAccountListQueryDto) {
    const companyId = getActiveCompanyId(user);
    await ensureActiveCompanyAccess(this.prisma, user, companyId);

    return {
      accounts: await this.findOptions({
        companyId,
        query,
      }),
    };
  }

  async findOptions({ companyId, query }: { companyId: number; query: GetChartAccountListQueryDto }) {
    const parentAccountId = parseOptionalPositiveBigIntIdOrUndefined(query.parentAccountId, 'parentAccountId');
    const search = query.search?.trim();
    const accounts = await this.prisma.chartAccount.findMany({
      where: {
        companyId,
        deletedAt: null,
        status: ChartAccountStatus.ACTIVE,
        ...(query.accountLevel ? { accountLevel: query.accountLevel } : {}),
        ...(query.accountType ? { accountType: query.accountType } : {}),
        ...(query.accountNature ? { accountNature: query.accountNature } : {}),
        ...(query.postingOnly === true ? { isPostingAccount: true } : {}),
        ...(parentAccountId !== undefined ? { parentAccountId } : {}),
        ...(search
          ? {
              OR: [{ accountCode: { contains: search, mode: 'insensitive' } }, { accountTitle: { contains: search, mode: 'insensitive' } }],
            }
          : {}),
      },
      select: {
        id: true,
        accountCode: true,
        accountTitle: true,
        accountType: true,
        accountNature: true,
        status: true,
      },
      orderBy: [{ accountCode: 'asc' }, { accountTitle: 'asc' }, { id: 'asc' }],
    });

    return accounts.map((account) => ({
      id: account.id.toString(),
      accountCode: account.accountCode,
      accountTitle: account.accountTitle,
      accountType: account.accountType,
      accountNature: account.accountNature,
      status: account.status,
    }));
  }
}
