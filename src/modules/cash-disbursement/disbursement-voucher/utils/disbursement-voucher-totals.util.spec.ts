import { amountsMatch, getDisbursementVoucherDetailTotals, getJournalEntryTotals, roundCurrency } from './disbursement-voucher-totals.util';

describe('disbursement voucher total utilities', () => {
  it('rounds currency values to two decimal places', () => {
    expect(roundCurrency(10.005)).toBe(10.01);
    expect(roundCurrency(10.004)).toBe(10);
  });

  it('compares amounts within the configured tolerance', () => {
    expect(amountsMatch(100, 100.004)).toBe(true);
    expect(amountsMatch(100, 100.02)).toBe(false);
    expect(amountsMatch(100, 100.02, 0.03)).toBe(true);
  });

  it('aggregates voucher detail and journal-entry totals', () => {
    expect(
      getDisbursementVoucherDetailTotals([
        { debit: 100.005, grossAmount: 112, netAmount: 110, disburseAmount: 110, vatAmount: 12, ewtAmount: 2 },
        { credit: 10, amount: 25 },
      ]),
    ).toEqual({
      credit: 10,
      debit: 100.01,
      disburseAmount: 135,
      ewtAmount: 2,
      grossAmount: 137,
      netAmount: 135,
      vatAmount: 12,
    });
    expect(getJournalEntryTotals([{ debit: 75.25 }, { credit: 75.25 }])).toEqual({ credit: 75.25, debit: 75.25 });
  });
});
