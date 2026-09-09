import type { Prisma, TransactionNumberSequence } from '@prisma/client';
import type { PrismaService } from '../../../../prisma/prisma.service';

export type TransactionNumberWriteClient = PrismaService | Prisma.TransactionClient;

export type TransactionNumberScope = 'all' | 'branch';

export type TransactionNumberSequenceWithModule = TransactionNumberSequence & { module: { code: string } };

export type TransactionNumberContext = {
  branchUnitId: number;
  companyId: number;
  moduleCode: string;
};

export type TransactionNumberFallbackOptions = {
  createDefaultIfMissing?: boolean;
};

export type TransactionNumberIssueContext = TransactionNumberContext & {
  scope: TransactionNumberScope;
};

export type TransactionNumberIssueCheck = (transactionNumber: string, context: TransactionNumberIssueContext) => Promise<boolean>;

export type ResolveTransactionNumberOptions = TransactionNumberContext &
  TransactionNumberFallbackOptions & {
    isIssued?: TransactionNumberIssueCheck;
    requestedTransactionNumber?: string | null;
  };

export type SuggestTransactionNumberOptions = TransactionNumberContext &
  TransactionNumberFallbackOptions & {
    isIssued?: TransactionNumberIssueCheck;
  };
