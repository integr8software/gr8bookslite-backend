import type { CollectionReceiptDetails } from '@prisma/client';
import type { CollectionReceiptDetailDto } from '../dto/collection-receipt-detail.dto';
import type { CollectionReceiptJournalEntryDto } from '../dto/collection-receipt-journal-entry.dto';
import type { CollectionReceiptJournalEntry } from '../types/collection-receipt-with-details.type';

export function roundCurrency(value: number) {
  return Math.round(Number(value || 0) * 100) / 100;
}

export function amountsMatch(left: number, right: number) {
  return Math.abs(roundCurrency(left) - roundCurrency(right)) < 0.01;
}

export function getCollectionReceiptDetailTotals(details: CollectionReceiptDetailDto[]) {
  return details.reduce(
    (total, detail) => ({
      grossAmount: roundCurrency(total.grossAmount + Number(detail.grossAmount || 0)),
      netAmount: roundCurrency(total.netAmount + Number(detail.netAmount || 0)),
      vatAmount: roundCurrency(total.vatAmount + Number(detail.vatAmount || 0)),
    }),
    { grossAmount: 0, netAmount: 0, vatAmount: 0 },
  );
}

export function getPersistedCollectionReceiptDetailGross(details: CollectionReceiptDetails[]) {
  return roundCurrency(details.reduce((sum, detail) => sum + Number(detail.grossAmount), 0));
}

export function getJournalEntryTotals(journalEntries: Array<CollectionReceiptJournalEntryDto | CollectionReceiptJournalEntry>) {
  return journalEntries.reduce(
    (total, entry) => ({
      credit: roundCurrency(total.credit + Number(entry.credit || 0)),
      debit: roundCurrency(total.debit + Number(entry.debit || 0)),
    }),
    { credit: 0, debit: 0 },
  );
}
