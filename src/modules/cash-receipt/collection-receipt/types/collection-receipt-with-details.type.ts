import type { JournalEntryDetail, Prisma } from '@prisma/client';
import { CollectionReceiptInclude } from '../prisma/collection-receipt.include';

export type CollectionReceiptJournalEntry = JournalEntryDetail & {
  currencyCode: string;
  exchangeRate: Prisma.Decimal;
  particulars: string | null;
  referenceId: bigint;
  referenceNo: string | null;
  referenceType: string;
};

export type CollectionReceiptWithDetails = Prisma.CollectionReceiptGetPayload<{
  include: typeof CollectionReceiptInclude;
}> & {
  journalEntries: CollectionReceiptJournalEntry[];
};
