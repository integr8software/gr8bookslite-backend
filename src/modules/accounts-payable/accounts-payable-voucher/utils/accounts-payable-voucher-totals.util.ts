import type { AccountsPayableVoucherDetailsDto } from '../dto/accounts-payable-voucher-details.dto';
import type { JournalEntryDto } from '../dto/journal-entry.dto';

export function roundCurrency(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.round(value * 100) / 100;
}

export function getAccountsPayableVoucherDetailTotals(details: AccountsPayableVoucherDetailsDto[]) {
  return details.reduce(
    (totals, detail) => ({
      grossAmount: roundCurrency(totals.grossAmount + Number(detail.amount || 0)),
      netAmount: roundCurrency(totals.netAmount + Number(detail.netAmount || 0)),
      totalAmountDue: roundCurrency(totals.totalAmountDue + Number(detail.totalAmountDue || 0)),
    }),
    {
      grossAmount: 0,
      netAmount: 0,
      totalAmountDue: 0,
    },
  );
}

export function getJournalEntryTotals(entries: JournalEntryDto[]) {
  return entries.reduce(
    (totals, entry) => ({
      credit: roundCurrency(totals.credit + Number(entry.credit || 0)),
      debit: roundCurrency(totals.debit + Number(entry.debit || 0)),
    }),
    {
      credit: 0,
      debit: 0,
    },
  );
}

export function amountsMatch(left: number, right: number) {
  return Math.abs(roundCurrency(left) - roundCurrency(right)) < 0.01;
}
