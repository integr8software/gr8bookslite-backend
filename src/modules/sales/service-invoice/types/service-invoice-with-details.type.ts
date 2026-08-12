import type { JournalEntryDetail, Prisma } from '@prisma/client';
import { ServiceInvoiceInclude } from '../prisma/service-invoice.include';

export type ServiceInvoiceJournalEntry = JournalEntryDetail & {
  currencyCode: string;
  exchangeRate: Prisma.Decimal;
  particulars: string | null;
  referenceId: bigint;
  referenceNo: string | null;
  referenceType: string;
};

export type ServiceInvoiceWithDetails = Prisma.ServiceInvoiceGetPayload<{
  include: typeof ServiceInvoiceInclude;
}> & {
  journalEntries: ServiceInvoiceJournalEntry[];
};
