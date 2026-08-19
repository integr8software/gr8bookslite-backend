import type { JournalEntryDetail, Prisma } from '@prisma/client';
import { BillingStatementInclude } from '../prisma/billing-statement.include';

export type BillingStatementJournalEntry = JournalEntryDetail & {
  currencyCode: string;
  exchangeRate: Prisma.Decimal;
  particulars: string | null;
  referenceId: bigint;
  referenceNo: string | null;
  referenceType: string;
};

export type BillingStatementWithDetails = Prisma.BillingStatementGetPayload<{
  include: typeof BillingStatementInclude;
}> & {
  journalEntries: BillingStatementJournalEntry[];
};
