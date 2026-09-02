import type { ProvisionalReceiptDetailDto } from '../dto/provisional-receipt-detail.dto';
import type { ProvisionalReceiptJournalEntryDto } from '../dto/provisional-receipt-journal-entry.dto';
import { ProvisionalReceiptAccountingService } from './provisional-receipt-accounting.service';

describe('ProvisionalReceiptAccountingService', () => {
  const service = new ProvisionalReceiptAccountingService();
  const createPayload = () => {
    const detail: ProvisionalReceiptDetailDto = {
      lineNumber: 1,
      description: 'Service Revenue',
      vatPercent: 12,
      cwtPercent: 2,
      netAmount: 44000,
      vatAmount: 6000,
      ewtAmount: 1000,
      grossAmount: 50000,
      totalReceived: 49000,
    };
    const journalEntries: ProvisionalReceiptJournalEntryDto[] = [
      { accountCode: '1010103001', accountTitle: 'Cash in Bank', debit: 49000, credit: 0 },
      { accountCode: '1010104008', accountTitle: 'Creditable Withholding Tax', debit: 1000, credit: 0 },
      { accountCode: '2010002005', accountTitle: 'Output VAT', debit: 0, credit: 6000 },
      { accountCode: '4020000001', accountTitle: 'Service Revenue', debit: 0, credit: 44000 },
    ].map((entry, index) => ({ ...entry, lineNumber: index + 1, referenceType: 'PVR', currencyCode: 'PHP', exchangeRate: 1 }));
    return { currencyCode: 'PHP', details: [detail], exchangeRate: 1, grossAmount: 50000, journalEntries };
  };

  it('accepts one collection detail with its four balanced accounting distributions', () => {
    expect(() => service.validateSubmittedPayload(createPayload())).not.toThrow();
  });

  it('rejects a receipt total different from its collection details', () => {
    expect(() => service.validateSubmittedPayload({ ...createPayload(), grossAmount: 49000 })).toThrow(
      'Item gross amount total must match receipt gross amount.',
    );
  });

  it('rejects unbalanced journal totals', () => {
    const payload = createPayload();
    payload.journalEntries[0].debit = 48000;
    expect(() => service.validateSubmittedPayload(payload)).toThrow('Journal entry debit and credit totals must balance.');
  });

  it('rejects a line with both debit and credit', () => {
    const payload = createPayload();
    payload.journalEntries[0].credit = 1;
    expect(() => service.validateSubmittedPayload(payload)).toThrow('Journal line 1 cannot have both debit and credit.');
  });

  it('rejects journal currency mismatches', () => {
    const payload = createPayload();
    payload.journalEntries[0].currencyCode = 'USD';
    expect(() => service.validateSubmittedPayload(payload)).toThrow('Journal line 1 currency must match the receipt currency.');
  });

  it('rejects journal exchange rate mismatches', () => {
    const payload = createPayload();
    payload.journalEntries[0].exchangeRate = 2;
    expect(() => service.validateSubmittedPayload(payload)).toThrow('Journal line 1 exchange rate must match the receipt exchange rate.');
  });
});
