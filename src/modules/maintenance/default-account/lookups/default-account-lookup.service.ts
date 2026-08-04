import { Injectable } from '@nestjs/common';
import { AccountNature, ChartAccountStatus, ChartAccountType, DefaultAccountTemplateType, Prisma } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import { findSystemAccountGroupOrThrow, SystemAccountGroups } from '../../chart-of-accounts/utils/system-account-groups.util';
import { DefaultAccountOptionQueryDto } from '../dto/default-account-option-query.dto';

@Injectable()
export class DefaultAccountLookupService {
  constructor(private readonly prisma: PrismaService) {}

  async findDefaultAccountOptions({
    companyId,
    query,
    type,
  }: {
    companyId: number;
    query: DefaultAccountOptionQueryDto;
    type?: DefaultAccountTemplateType;
  }) {
    const where = this.buildDefaultAccountOptionWhere(companyId, query, type);
    const defaultAccounts = await this.prisma.defaultAccount.findMany({
      where,
      select: {
        id: true,
        type: true,
        name: true,
        description: true,
        status: true,
        expenseCoa: {
          select: {
            id: true,
            accountCode: true,
            accountTitle: true,
            accountType: true,
            accountNature: true,
          },
        },
        revenueCoa: {
          select: {
            id: true,
            accountCode: true,
            accountTitle: true,
            accountType: true,
            accountNature: true,
          },
        },
      },
      orderBy: [{ type: 'asc' }, { name: 'asc' }, { id: 'asc' }],
    });

    return defaultAccounts.map((defaultAccount) => {
      const chartAccount = defaultAccount.type === DefaultAccountTemplateType.EXPENSE ? defaultAccount.expenseCoa : defaultAccount.revenueCoa;

      return {
        id: defaultAccount.id.toString(),
        type: defaultAccount.type,
        defaultAccountName: defaultAccount.name,
        description: defaultAccount.description ?? '',
        status: defaultAccount.status,
        chartAccountId: chartAccount?.id.toString() ?? null,
        accountCode: chartAccount?.accountCode ?? null,
        accountTitle: chartAccount?.accountTitle ?? null,
        accountType: chartAccount?.accountType ?? null,
        accountNature: chartAccount?.accountNature ?? null,
      };
    });
  }

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

  private buildDefaultAccountOptionWhere(
    companyId: number,
    query: DefaultAccountOptionQueryDto,
    type?: DefaultAccountTemplateType,
  ): Prisma.DefaultAccountWhereInput {
    const search = query.search?.trim();

    return {
      companyId,
      deletedAt: null,
      type: type ?? { in: [DefaultAccountTemplateType.EXPENSE, DefaultAccountTemplateType.COLLECTION] },
      status: query.status ?? ChartAccountStatus.ACTIVE,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } },
              { expenseCoa: { accountCode: { contains: search, mode: 'insensitive' } } },
              { expenseCoa: { accountTitle: { contains: search, mode: 'insensitive' } } },
              { revenueCoa: { accountCode: { contains: search, mode: 'insensitive' } } },
              { revenueCoa: { accountTitle: { contains: search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };
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
