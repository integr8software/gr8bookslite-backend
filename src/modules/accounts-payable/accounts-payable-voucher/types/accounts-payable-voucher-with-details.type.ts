import type { JournalEntryDetail, Prisma } from '@prisma/client';
import { AccountsPayableVoucherInclude } from '../prisma/accounts-payable-voucher.include';

export type AccountsPayableVoucherJournalEntry = JournalEntryDetail & {
  currencyCode: string;
  exchangeRate: Prisma.Decimal;
  particulars: string | null;
  referenceId: bigint;
  referenceNo: string | null;
  referenceType: string;
};

export type AccountsPayableVoucherWithDetails = Prisma.AccountsPayableVoucherGetPayload<{
  include: typeof AccountsPayableVoucherInclude;
}> & {
  journalEntries: AccountsPayableVoucherJournalEntry[];
};
