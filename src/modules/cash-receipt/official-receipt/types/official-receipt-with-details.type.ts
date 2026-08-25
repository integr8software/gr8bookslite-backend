import type { JournalEntryDetail, Prisma } from '@prisma/client';
import { OfficialReceiptInclude } from '../prisma/official-receipt.include';

export type OfficialReceiptJournalEntry = JournalEntryDetail & {
  currencyCode: string;
  exchangeRate: Prisma.Decimal;
  particulars: string | null;
  referenceId: bigint;
  referenceNo: string | null;
  referenceType: string;
};

export type OfficialReceiptWithDetails = Prisma.OfficialReceiptGetPayload<{
  include: typeof OfficialReceiptInclude;
}> & {
  journalEntries: OfficialReceiptJournalEntry[];
};
