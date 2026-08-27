import type { JournalEntryDetail, Prisma } from '@prisma/client';
import { AcknowledgementReceiptInclude } from '../prisma/acknowledgement-receipt.include';

export type AcknowledgementReceiptJournalEntry = JournalEntryDetail & {
  currencyCode: string;
  exchangeRate: Prisma.Decimal;
  particulars: string | null;
  referenceId: bigint;
  referenceNo: string | null;
  referenceType: string;
};

export type AcknowledgementReceiptWithDetails = Prisma.AcknowledgementReceiptGetPayload<{
  include: typeof AcknowledgementReceiptInclude;
}> & {
  journalEntries: AcknowledgementReceiptJournalEntry[];
};
