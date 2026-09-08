import { getCopiedDetailAmount, getCopiedDetailPayableAmount } from './copy-from.util';

describe('getCopiedDetailAmount', () => {
  it('uses gross amount as the Copy From consumption basis', () => {
    expect(
      getCopiedDetailAmount({
        debit: 4400,
        disburseAmount: 4850,
        grossAmount: 5000,
      }),
    ).toBe(5000);
  });

  it('supports older target details that only stored debit', () => {
    expect(getCopiedDetailAmount({ debit: 3000 })).toBe(3000);
  });

  it('tracks payable independently from gross amount', () => {
    const detail = { debit: 4400, disburseAmount: 4850, grossAmount: 5000 };

    expect(getCopiedDetailAmount(detail)).toBe(5000);
    expect(getCopiedDetailPayableAmount(detail)).toBe(4850);
  });
});
