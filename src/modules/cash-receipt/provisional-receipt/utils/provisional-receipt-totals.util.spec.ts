import { amountsMatch, getJournalEntryTotals, getProvisionalReceiptDetailTotals, roundCurrency } from './provisional-receipt-totals.util';

describe('provisional receipt total utilities', () => {
  it('rounds currency values to two decimal places', () => {
    expect(roundCurrency(10.005)).toBe(10.01);
    expect(roundCurrency(undefined as unknown as number)).toBe(0);
  });

  it('compares amounts after currency rounding', () => {
    expect(amountsMatch(100.004, 100)).toBe(true);
    expect(amountsMatch(100.02, 100)).toBe(false);
  });

  it('totals detail rows using the persisted receipt amount fields', () => {
    expect(
      getProvisionalReceiptDetailTotals([
        { grossAmount: 100.125, netAmount: 89.995, vatAmount: 10.125 },
        { grossAmount: 50.335, netAmount: 44.445, vatAmount: 5.555 },
      ] as never),
    ).toEqual({ grossAmount: 150.47, netAmount: 134.45, vatAmount: 15.69 });
  });

  it('totals debit and credit journal entry columns independently', () => {
    expect(
      getJournalEntryTotals([
        { debit: 150.125, credit: 0 },
        { debit: 0, credit: 150.125 },
      ] as never),
    ).toEqual({ debit: 150.13, credit: 150.13 });
  });
});
