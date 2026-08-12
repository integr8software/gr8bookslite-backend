import type { ServiceInvoiceDetails } from '@prisma/client';
import type { ServiceInvoiceDetailDto } from '../dto/service-invoice-detail.dto';
import type { ServiceInvoiceJournalEntryDto } from '../dto/service-invoice-journal-entry.dto';
import type { ServiceInvoiceJournalEntry } from '../types/service-invoice-with-details.type';

export function roundCurrency(value: number) {
  return Math.round(Number(value || 0) * 100) / 100;
}

export function amountsMatch(left: number, right: number) {
  return Math.abs(roundCurrency(left) - roundCurrency(right)) < 0.01;
}

export function getServiceInvoiceDetailTotals(details: ServiceInvoiceDetailDto[]) {
  return details.reduce(
    (total, detail) => ({
      discountAmount: roundCurrency(total.discountAmount + Number(detail.discountAmount || 0)),
      grossAmount: roundCurrency(total.grossAmount + Number(detail.grossAmount || 0)),
      netAmount: roundCurrency(total.netAmount + Number(detail.netAmount || 0)),
      vatAmount: roundCurrency(total.vatAmount + Number(detail.vatAmount || 0)),
    }),
    { discountAmount: 0, grossAmount: 0, netAmount: 0, vatAmount: 0 },
  );
}

export function getPersistedServiceInvoiceDetailGross(details: ServiceInvoiceDetails[]) {
  return roundCurrency(details.reduce((sum, detail) => sum + Number(detail.grossAmount), 0));
}

export function getJournalEntryTotals(journalEntries: Array<ServiceInvoiceJournalEntryDto | ServiceInvoiceJournalEntry>) {
  return journalEntries.reduce(
    (total, entry) => ({
      credit: roundCurrency(total.credit + Number(entry.credit || 0)),
      debit: roundCurrency(total.debit + Number(entry.debit || 0)),
    }),
    { credit: 0, debit: 0 },
  );
}
