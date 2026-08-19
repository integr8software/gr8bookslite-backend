export function roundCurrency(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.round(value * 100) / 100;
}

import type { Prisma } from '@prisma/client';

type NumericValue = number | string | Prisma.Decimal;

export function getJournalVoucherTotals(entries: Array<{ debit: NumericValue; credit: NumericValue }>) {
  return entries.reduce<{ credit: number; debit: number }>(
    (totals, entry) => ({
      credit: roundCurrency(totals.credit + Number(entry.credit || 0)),
      debit: roundCurrency(totals.debit + Number(entry.debit || 0)),
    }),
    { credit: 0, debit: 0 },
  );
}

export function amountsMatch(left: number, right: number) {
  return Math.abs(roundCurrency(left) - roundCurrency(right)) < 0.01;
}
