import type { JournalEntryDetail, Prisma } from '@prisma/client';
import { ProvisionalReceiptInclude } from '../prisma/provisional-receipt.include';

export type ProvisionalReceiptJournalEntry = JournalEntryDetail & {
  currencyCode: string;
  exchangeRate: Prisma.Decimal;
  particulars: string | null;
  referenceId: bigint;
  referenceNo: string | null;
  referenceType: string;
};

export type ProvisionalReceiptWithDetails = Prisma.ProvisionalReceiptGetPayload<{
  include: typeof ProvisionalReceiptInclude;
}> & {
  journalEntries: ProvisionalReceiptJournalEntry[];
};
