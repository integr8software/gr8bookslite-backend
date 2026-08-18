import type { JournalEntryDetail, Prisma } from '@prisma/client';
import { BillingInvoiceInclude } from '../prisma/billing-invoice.include';

export type BillingInvoiceJournalEntry = JournalEntryDetail & {
  currencyCode: string;
  exchangeRate: Prisma.Decimal;
  particulars: string | null;
  referenceId: bigint;
  referenceNo: string | null;
  referenceType: string;
};

export type BillingInvoiceWithDetails = Prisma.BillingInvoiceGetPayload<{
  include: typeof BillingInvoiceInclude;
}> & {
  journalEntries: BillingInvoiceJournalEntry[];
};
