import { BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import {
  RevolvingFundReplenishmentCopySourceService,
  formatRevolvingFundReplenishmentReference,
  parseRevolvingFundReplenishmentReference,
} from './revolving-fund-replenishment-copy-source.service';

describe('RevolvingFundReplenishmentCopySourceService', () => {
  const service = new RevolvingFundReplenishmentCopySourceService({} as PrismaService);

  it('formats RFR reference correctly', () => {
    expect(formatRevolvingFundReplenishmentReference('RFR-2026-0001')).toBe('RFR:RFR-2026-0001');
  });

  it('parses valid RFR reference correctly', () => {
    expect(parseRevolvingFundReplenishmentReference('RFR:RFR-2026-0001')).toBe('RFR-2026-0001');
  });

  it('throws BadRequestException for invalid RFR reference', () => {
    expect(() => parseRevolvingFundReplenishmentReference('INVALID:123')).toThrow(BadRequestException);
    expect(() => parseRevolvingFundReplenishmentReference('RFR:')).toThrow(BadRequestException);
  });

  it('extracts copied voucher detail amounts and ignores generated rows', () => {
    const allocations = service.getCopiedVoucherDetailAmounts([
      { refId: 'RFR:RFR-2026-0001', grossAmount: 8000, disburseAmount: 8000 },
      { refId: 'RFR:RFR-2026-0001', grossAmount: 2000, disburseAmount: 2000 },
      { id: 'auto-ewt', accountTitle: 'Expanded Withholding Tax', debit: 0, credit: 100 },
    ]);

    expect(allocations).toEqual([{ reference: 'RFR:RFR-2026-0001', grossAmount: 10000, disburseAmount: 10000 }]);
  });
});
