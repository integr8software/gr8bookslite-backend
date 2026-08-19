import type { JournalEntryDetail, Prisma } from '@prisma/client';
import { JournalVoucherInclude } from '../prisma/journal-voucher.include';

export type JournalVoucherJournalEntry = JournalEntryDetail & {
  currencyCode: string;
  exchangeRate: Prisma.Decimal;
  particulars: string | null;
  referenceId: bigint;
  referenceNo: string | null;
  referenceType: string;
};

export type JournalVoucherBase = Prisma.JournalVoucherGetPayload<{
  include: typeof JournalVoucherInclude;
}>;

export type JournalVoucherWithEntries = JournalVoucherBase & {
  journalEntries: JournalVoucherJournalEntry[];
  totalDebit: Prisma.Decimal | number;
  totalCredit: Prisma.Decimal | number;
};

export type JournalVoucherListRow = JournalVoucherBase & {
  totalDebit: Prisma.Decimal | number;
  totalCredit: Prisma.Decimal | number;
};
