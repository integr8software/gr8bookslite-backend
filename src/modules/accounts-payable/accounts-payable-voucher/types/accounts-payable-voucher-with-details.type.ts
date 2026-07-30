import type { JournalEntry, Prisma } from '@prisma/client';
import { AccountsPayableVoucherInclude } from '../prisma/accounts-payable-voucher.include';

export type AccountsPayableVoucherWithDetails = Prisma.AccountsPayableVoucherGetPayload<{
  include: typeof AccountsPayableVoucherInclude;
}> & {
  journalEntries: JournalEntry[];
};
