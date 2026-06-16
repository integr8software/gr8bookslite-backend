import type { Prisma } from '@prisma/client';
import { ChartAccountInclude } from '../prisma/chart-account.include';

export type ChartAccountPayload = Prisma.ChartAccountGetPayload<{
  include: typeof ChartAccountInclude;
}>;

export type ChartAccountTreePayload = ChartAccountPayload & {
  children?: ChartAccountTreePayload[];
};

export function mapChartAccount(account: ChartAccountPayload) {
  return {
    id: Number(account.id),
    companyId: account.companyId,
    parentAccountId:
      account.parentAccountId === null ? null : Number(account.parentAccountId),
    accountCode: account.accountCode,
    accountTitle: account.accountTitle,
    accountLevel: account.accountLevel,
    accountType: account.accountType,
    accountNature: account.accountNature,
    accountGroup: account.accountGroup,
    reportAlias: account.reportAlias,
    class: account.class,
    isPostingAccount: account.isPostingAccount,
    withSubsidiary: account.withSubsidiary,
    contraAccount: account.contraAccount,
    showTotal: account.showTotal,
    orderNo: account.orderNo,
    status: account.status,
    currencyCode: account.currencyCode,
    deletedAt: account.deletedAt?.toISOString() ?? null,
    createdAt: account.createdAt.toISOString(),
    updatedAt: account.updatedAt.toISOString(),
    bankAccounts: account.bankAccounts.map((bankAccount) => ({
      id: Number(bankAccount.id),
      companyId: bankAccount.companyId,
      coaId: Number(bankAccount.coaId),
      bankName: bankAccount.bankName,
      branch: bankAccount.branch,
      accountNumber: bankAccount.accountNumber,
      accountName: bankAccount.accountName,
      currencyCode: bankAccount.currencyCode,
      isDefault: bankAccount.isDefault,
      status: bankAccount.status,
    })),
  };
}

export function mapChartAccountTreeNode(account: ChartAccountTreePayload) {
  return {
    ...mapChartAccount(account),
    children: (account.children ?? []).map(mapChartAccountTreeNode),
  };
}
