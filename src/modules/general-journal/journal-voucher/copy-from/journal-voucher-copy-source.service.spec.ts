import { BadRequestException } from '@nestjs/common';
import { JournalVoucherCopySourceService } from './journal-voucher-copy-source.service';

describe('JournalVoucherCopySourceService', () => {
  const service = new JournalVoucherCopySourceService({} as never);
  const privateService = service as unknown as {
    getCopiedReferenceLines: (details: Array<Record<string, unknown>>, target: string) => Array<{ amount: number; reference: string }>;
    parseReference: (reference: string) => { lineNumber: number; transactionNo: string };
  };

  it('totals JV reference lines using the target voucher amount field', () => {
    expect(
      privateService.getCopiedReferenceLines(
        [
          { refId: 'JV:JV-000001:L2', disburseAmount: 100.125 },
          { referenceNo: 'JV:JV-000001:L2', totalAmountDue: 25 },
          { refId: 'APV:APV-000001', disburseAmount: 999 },
        ],
        'cash-voucher',
      ),
    ).toEqual([{ reference: 'JV:JV-000001:L2', amount: 125.13 }]);
  });

  it('parses public JV line references without using child process execution', () => {
    expect(privateService.parseReference(' JV:JV-2026-000001:L12 ')).toEqual({
      transactionNo: 'JV-2026-000001',
      lineNumber: 12,
    });
  });

  it('rejects malformed JV references', () => {
    expect(() => privateService.parseReference('JV-2026-000001')).toThrow(BadRequestException);
  });
});
