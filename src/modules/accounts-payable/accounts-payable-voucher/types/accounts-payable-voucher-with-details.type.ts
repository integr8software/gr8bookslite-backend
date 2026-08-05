import type { JournalEntryDetail, JournalEntryHeader, Prisma } from '@prisma/client';
import { AccountsPayableVoucherInclude } from '../prisma/accounts-payable-voucher.include';

export type JournalEntryHeaderWithDetails = JournalEntryHeader & {
  details: JournalEntryDetail[];
};

export type AccountsPayableVoucherJournalEntry = {
  accountCodeSnapshot: string;
  accountId: bigint;
  accountTitleSnapshot: string;
  atcCode: string | null;
  credit: Prisma.Decimal;
  currencyCode: string;
  debit: Prisma.Decimal;
  exchangeRate: Prisma.Decimal;
  id: bigint;
  lineNumber: number;
  particulars: string | null;
  partyCodeSnapshot: string | null;
  partyNameSnapshot: string | null;
  referenceId: bigint;
  referenceNoSnapshot: string | null;
  referenceType: string;
  refNo: string | null;
  responsibilityCenterId: bigint | null;
  responsibilityCenterSnapshot: string | null;
  vatType: string | null;
};

export type AccountsPayableVoucherWithDetails = Prisma.AccountsPayableVoucherGetPayload<{
  include: typeof AccountsPayableVoucherInclude;
}> & {
  journalEntryHeader: JournalEntryHeaderWithDetails | null;
  journalEntries: AccountsPayableVoucherJournalEntry[];
};
