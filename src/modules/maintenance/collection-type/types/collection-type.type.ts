import type { AccountNature, ChartAccountLevel, ChartAccountType, Prisma } from '@prisma/client';
import { CollectionTypeInclude } from '../prisma/collection-type-template.include';

export type CollectionTypePayload = Prisma.DefaultAccountGetPayload<{
  include: typeof CollectionTypeInclude;
}>;

export type GeneratedDefaultAccount = NonNullable<CollectionTypePayload['revenueCoa']>;

export type CollectionTypeParentRole = 'REVENUE_PARENT';

export type GeneratedAccountKey = never;

export type GeneratedAccountResultKey = 'revenueCoaId';

export type ParentChartAccountReference = {
  id: bigint;
  accountCode: string;
  accountLevel: ChartAccountLevel;
};

export type GeneratedAccountRequest = {
  role: CollectionTypeParentRole;
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
