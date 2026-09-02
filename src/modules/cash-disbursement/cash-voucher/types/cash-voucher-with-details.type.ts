import { Prisma } from '@prisma/client';
import { CashVoucherInclude } from '../prisma/cash-voucher.include';

export type CashVoucherJournalEntry = {
  id: bigint;
  jeno: bigint;
  companyId: number;
  lineNumber: number;
  accountId: bigint | null;
  accountCodeSnapshot: string;
  accountTitleSnapshot: string;
  currencyCode: string;
  exchangeRate: Prisma.Decimal;
  particulars: string | null;
  debit: Prisma.Decimal;
  credit: Prisma.Decimal;
  vatType: string | null;
  atcCode: string | null;
  partyCodeSnapshot: string | null;
  partyNameSnapshot: string | null;
  responsibilityCenterId: bigint | null;
  responsibilityCenterSnapshot: string | null;
  refNo: string | null;
  referenceId: bigint;
  referenceNo: string | null;
  referenceType: string;
};

export type CashVoucherWithDetails = Prisma.CashVoucherGetPayload<{
  include: typeof CashVoucherInclude;
}> & {
  journalEntries: CashVoucherJournalEntry[];
};
