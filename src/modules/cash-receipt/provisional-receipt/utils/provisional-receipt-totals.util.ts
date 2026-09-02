import type { ProvisionalReceiptDetails } from '@prisma/client';
import type { ProvisionalReceiptDetailDto } from '../dto/provisional-receipt-detail.dto';
import type { ProvisionalReceiptJournalEntryDto } from '../dto/provisional-receipt-journal-entry.dto';
import type { ProvisionalReceiptJournalEntry } from '../types/provisional-receipt-with-details.type';

export function roundCurrency(value: number) {
  return Math.round(Number(value || 0) * 100) / 100;
}

export function amountsMatch(left: number, right: number) {
  return Math.abs(roundCurrency(left) - roundCurrency(right)) < 0.01;
}

export function getProvisionalReceiptDetailTotals(details: ProvisionalReceiptDetailDto[]) {
  return details.reduce(
    (total, detail) => ({
      grossAmount: roundCurrency(total.grossAmount + Number(detail.grossAmount || 0)),
      netAmount: roundCurrency(total.netAmount + Number(detail.netAmount || 0)),
      vatAmount: roundCurrency(total.vatAmount + Number(detail.vatAmount || 0)),
    }),
    { grossAmount: 0, netAmount: 0, vatAmount: 0 },
  );
}

export function getPersistedProvisionalReceiptDetailGross(details: ProvisionalReceiptDetails[]) {
  return roundCurrency(details.reduce((sum, detail) => sum + Number(detail.grossAmount), 0));
}

export function getJournalEntryTotals(journalEntries: Array<ProvisionalReceiptJournalEntryDto | ProvisionalReceiptJournalEntry>) {
  return journalEntries.reduce(
    (total, entry) => ({
      credit: roundCurrency(total.credit + Number(entry.credit || 0)),
      debit: roundCurrency(total.debit + Number(entry.debit || 0)),
    }),
    { credit: 0, debit: 0 },
  );
}
