import { BadRequestException } from '@nestjs/common';
import { JournalVoucherAccountingService } from './journal-voucher-accounting.service';
import type { JournalVoucherLineDto } from '../dto/journal-voucher-line.dto';

describe('JournalVoucherAccountingService', () => {
  const service = new JournalVoucherAccountingService();

  function line(lineNumber: number, debit: number, credit: number): JournalVoucherLineDto {
    return {
      accountCode: `10${lineNumber}`,
      accountTitle: `Account ${lineNumber}`,
      credit,
      debit,
      lineNumber,
    };
  }

  it('accepts balanced debit and credit lines', () => {
    expect(
      service.validateSubmittedPayload({
        currencyCode: 'PHP',
        exchangeRate: 1,
        lines: [line(1, 100, 0), line(2, 0, 100)],
      }),
    ).toEqual({ totalCredit: 100, totalDebit: 100 });
  });

  it('rejects unbalanced totals', () => {
    expect(() =>
      service.validateSubmittedPayload({
        currencyCode: 'PHP',
        exchangeRate: 1,
        lines: [line(1, 100, 0), line(2, 0, 90)],
      }),
    ).toThrow(BadRequestException);
  });

  it('rejects a line with both debit and credit', () => {
    expect(() =>
      service.validateSubmittedPayload({
        currencyCode: 'PHP',
        exchangeRate: 1,
        lines: [line(1, 100, 10), line(2, 0, 90)],
      }),
    ).toThrow(BadRequestException);
  });

  it('rejects duplicate line numbers and fewer than two lines', () => {
    expect(() =>
      service.validateSubmittedPayload({
        currencyCode: 'PHP',
        exchangeRate: 1,
        lines: [line(1, 100, 0), line(1, 0, 100)],
      }),
    ).toThrow(BadRequestException);

    expect(() =>
      service.validateSubmittedPayload({
        currencyCode: 'PHP',
        exchangeRate: 1,
        lines: [line(1, 100, 0)],
      }),
    ).toThrow(BadRequestException);
  });
});
