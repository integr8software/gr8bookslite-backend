import type { AccountNature, ChartAccountLevel, ChartAccountType, Prisma } from '@prisma/client';
import { DisbursementTypeInclude } from '../prisma/disbursement-type-template.include';

export type DisbursementTypePayload = Prisma.DefaultAccountGetPayload<{
  include: typeof DisbursementTypeInclude;
}>;

export type GeneratedDefaultAccount = NonNullable<DisbursementTypePayload['expenseCoa']>;

export type DisbursementTypeParentRole = 'EXPENSE_PARENT' | 'REVENUE_PARENT';

export type GeneratedAccountKey = never;

export type GeneratedAccountResultKey = 'expenseCoaId' | 'revenueCoaId';

export type ParentChartAccountReference = {
  id: bigint;
  accountCode: string;
  accountLevel: ChartAccountLevel;
};

export type GeneratedAccountRequest = {
  role: DisbursementTypeParentRole;
  generatedKey?: GeneratedAccountKey;
  parentGeneratedKey?: GeneratedAccountKey;
  selectedParentAccount?: ParentChartAccountReference;
  resultKey?: GeneratedAccountResultKey;
  title: string;
  accountLevel: ChartAccountLevel;
  accountType: ChartAccountType;
  accountNature: AccountNature;
  accountGroup: string | string[];
  isPostingAccount: boolean;
};
