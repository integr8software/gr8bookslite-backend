import type { AccountNature, ChartAccountLevel, ChartAccountType, Prisma } from '@prisma/client';
import { DefaultAccountInclude } from '../prisma/default-account-template.include';

export type DefaultAccountPayload = Prisma.DefaultAccountGetPayload<{
  include: typeof DefaultAccountInclude;
}>;

export type GeneratedDefaultAccount = NonNullable<DefaultAccountPayload['expenseCoa']>;

export type DefaultAccountParentRole =
  | 'EXPENSE_PARENT'
  | 'REVENUE_PARENT'
  | 'FIXED_ASSET_PARENT'
  | 'ACCUMULATED_DEPRECIATION_PARENT'
  | 'DEPRECIATION_EXPENSE_PARENT';

export type GeneratedAccountKey = 'fixedAssetGroup';

export type GeneratedAccountResultKey = 'expenseCoaId' | 'revenueCoaId' | 'assetCoaId' | 'accumulatedDepreciationCoaId';

export type ParentChartAccountReference = {
  id: bigint;
  accountCode: string;
};

export type GeneratedAccountRequest = {
  role: DefaultAccountParentRole;
  generatedKey?: GeneratedAccountKey;
  parentGeneratedKey?: GeneratedAccountKey;
  selectedParentAccount?: ParentChartAccountReference;
  resultKey?: GeneratedAccountResultKey;
  title: string;
  accountLevel: ChartAccountLevel;
  accountType: ChartAccountType;
  accountNature: AccountNature;
  accountGroup: string;
  isPostingAccount: boolean;
};
