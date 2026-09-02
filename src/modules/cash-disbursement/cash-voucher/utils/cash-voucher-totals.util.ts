export function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function amountsMatch(left: number, right: number, epsilon = 0.01): boolean {
  return Math.abs(roundCurrency(left) - roundCurrency(right)) <= epsilon;
}

export type CashVoucherDetailTotals = {
  credit: number;
  debit: number;
  disburseAmount: number;
  ewtAmount: number;
  grossAmount: number;
  netAmount: number;
  vatAmount: number;
};

export function getCashVoucherDetailTotals(
  details: Array<{
    amount?: number;
    debit?: number;
    credit?: number;
    grossAmount?: number;
    netAmount?: number;
    disburseAmount?: number;
    vatAmount?: number;
    ewtAmount?: number;
  }>,
): CashVoucherDetailTotals {
  let credit = 0;
  let debit = 0;
  let disburseAmount = 0;
  let ewtAmount = 0;
  let grossAmount = 0;
  let netAmount = 0;
  let vatAmount = 0;

  for (const detail of details) {
    const gross = Number(detail.grossAmount ?? detail.amount ?? detail.debit ?? 0);
    const net = Number(detail.netAmount ?? gross);
    const disburse = Number(detail.disburseAmount ?? detail.amount ?? detail.debit ?? 0);
    const dDebit = Number(detail.debit ?? 0);
    const dCredit = Number(detail.credit ?? 0);
    const vat = Number(detail.vatAmount ?? 0);
    const ewt = Number(detail.ewtAmount ?? 0);

    credit += dCredit;
    debit += dDebit;
    disburseAmount += disburse;
    ewtAmount += ewt;
    grossAmount += gross;
    netAmount += net;
    vatAmount += vat;
  }

  return {
    credit: roundCurrency(credit),
    debit: roundCurrency(debit),
    disburseAmount: roundCurrency(disburseAmount),
    ewtAmount: roundCurrency(ewtAmount),
    grossAmount: roundCurrency(grossAmount),
    netAmount: roundCurrency(netAmount),
    vatAmount: roundCurrency(vatAmount),
  };
}

export type JournalEntryTotals = {
  credit: number;
  debit: number;
};

export function getJournalEntryTotals(
  journalEntries: Array<{
    credit?: number;
    debit?: number;
  }>,
): JournalEntryTotals {
  let credit = 0;
  let debit = 0;

  for (const entry of journalEntries) {
    credit += Number(entry.credit || 0);
    debit += Number(entry.debit || 0);
  }

  return {
    credit: roundCurrency(credit),
    debit: roundCurrency(debit),
  };
}
