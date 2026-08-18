import type { JournalEntryDetail, Prisma } from '@prisma/client';
import { BillingInclude } from '../prisma/billing.include';

export type BillingJournalEntry = JournalEntryDetail & {
  currencyCode: string;
  exchangeRate: Prisma.Decimal;
  particulars: string | null;
  referenceId: bigint;
  referenceNo: string | null;
  referenceType: string;
};

export type BillingWithDetails = Prisma.BillingGetPayload<{
  include: typeof BillingInclude;
}> & {
  journalEntries: BillingJournalEntry[];
};
