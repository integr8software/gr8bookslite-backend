import { CashVoucherAccountingService } from './cash-voucher-accounting.service';

describe('CashVoucherAccountingService', () => {
  const service = new CashVoucherAccountingService();

  it('does not count generated accounting rows in the voucher detail total', () => {
    expect(() =>
      service.validateSubmittedPayload({
        currencyCode: 'PHP',
        exchangeRate: 1,
        voucherAmount: 1000,
        details: [
          {
            id: 'expense-1',
            lineNumber: 1,
            accountCode: '6001',
            accountTitle: 'Office Supplies Expense',
            debit: 1000,
            grossAmount: 1000,
            netAmount: 1000,
            disburseAmount: 990,
          },
          {
            id: 'auto-ewt-current',
            lineNumber: 2,
            accountCode: '2101',
            accountTitle: 'Expanded Withholding Tax',
            credit: 10,
            grossAmount: 10,
            disburseAmount: 10,
          },
          {
            id: 'auto-credit-current',
            lineNumber: 3,
            accountCode: '1001',
            accountTitle: 'Cash on Hand',
            credit: 990,
            grossAmount: 990,
            disburseAmount: 990,
          },
        ],
      }),
    ).not.toThrow();
  });

  it('recognizes generated rows from older clients without row IDs', () => {
    expect(() =>
      service.validateSubmittedPayload({
        currencyCode: 'PHP',
        exchangeRate: 1,
        voucherAmount: 1000,
        details: [
          {
            lineNumber: 1,
            accountCode: '6001',
            accountTitle: 'Office Supplies Expense',
            debit: 1000,
            grossAmount: 1000,
            disburseAmount: 990,
          },
          {
            lineNumber: 2,
            accountCode: '2101',
            accountTitle: 'Expanded Withholding Tax',
            credit: 10,
            disburseAmount: 10,
          },
          {
            lineNumber: 3,
            accountCode: '1001',
            accountTitle: 'Cash on Hand',
            credit: 990,
            disburseAmount: 990,
          },
        ],
      }),
    ).not.toThrow();
  });
});
