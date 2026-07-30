import { Injectable } from '@nestjs/common';
import { AccountNature, ChartAccountStatus, ChartAccountType } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import { findSystemAccountGroupOrThrow, SystemAccountGroups } from '../../chart-of-accounts/utils/system-account-groups.util';

@Injectable()
export class DefaultAccountLookupService {
  constructor(private readonly prisma: PrismaService) {}

  async findExpenseParentOptions({ companyId }: { companyId: number }) {
    const root = await findSystemAccountGroupOrThrow(this.prisma, companyId, SystemAccountGroups.defaultAccount.expenseParent);
    const accounts = await this.prisma.chartAccount.findMany({
      where: {
        companyId,
        accountType: ChartAccountType.EXPENSE,
        accountNature: AccountNature.DEBIT,
        status: ChartAccountStatus.ACTIVE,
        deletedAt: null,
        isPostingAccount: false,
      },
      select: {
        id: true,
        accountCode: true,
        accountTitle: true,
        accountLevel: true,
        parentAccountId: true,
      },
      orderBy: [{ accountCode: 'asc' }],
    });
    const accountById = new Map(accounts.map((account) => [account.id, account]));

    return accounts.filter((account) => isDescendantOrSelf(account.id, root.id, accountById)).map((account) => ({
      id: account.id.toString(),
      accountCode: account.accountCode,
      accountTitle: account.accountTitle,
      accountLevel: account.accountLevel,
      parentAccountId: account.parentAccountId?.toString() ?? null,
    }));
  }
}

function isDescendantOrSelf(
  accountId: bigint,
  rootAccountId: bigint,
  accountById: Map<
    bigint,
    {
      id: bigint;
      parentAccountId: bigint | null;
    }
  >,
) {
  let currentId: bigint | null = accountId;

  while (currentId) {
    if (currentId === rootAccountId) {
      return true;
    }

    currentId = accountById.get(currentId)?.parentAccountId ?? null;
  }

  return false;
}
