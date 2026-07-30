import type { AccountNature, ChartAccountLevel, ChartAccountStatus, ChartAccountType, Prisma } from '@prisma/client';
import { ChartAccountInclude } from '../prisma/chart-account.include';

export type ChartAccountPayload = Prisma.ChartAccountGetPayload<{
  include: typeof ChartAccountInclude;
}>;

export type ChartAccountTreePayload = ChartAccountPayload & {
  children?: ChartAccountTreePayload[];
};

export type ChartAccountBankAccountResponse = {
  id: number;
  companyId: number;
  coaId: number;
  bankName: string;
  branch: string | null;
  accountNumber: string;
  accountName: string;
  currencyCode: string | null;
  isDefault: boolean;
  status: ChartAccountStatus;
};

export type ChartAccountResponse = {
  id: number;
  companyId: number;
  parentAccountId: number | null;
  accountCode: string;
  accountTitle: string;
  accountLevel: ChartAccountLevel;
  accountType: ChartAccountType | null;
  accountNature: AccountNature | null;
  accountGroup: string[];
  statementSection: string | null;
  reportAlias: string | null;
  description: string | null;
  isPostingAccount: boolean;
  withSubsidiary: boolean;
  contraAccount: boolean;
  showTotal: boolean;
  orderNo: number | null;
  status: ChartAccountStatus;
  currencyCode: string | null;
  isSystemDefault: boolean;
  isUserCreated: boolean;
  isBankLinked: boolean;
  deletedAt: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedBy: string | null;
  updatedAt: string | null;
  bankAccounts: ChartAccountBankAccountResponse[];
};

export type ChartAccountTreeResponse = ChartAccountResponse & {
  children: ChartAccountTreeResponse[];
};
