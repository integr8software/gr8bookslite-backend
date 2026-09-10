import { BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import {
  PettyCashReplenishmentCopySourceService,
  formatPettyCashReplenishmentReference,
  parsePettyCashReplenishmentReference,
} from './petty-cash-replenishment-copy-source.service';

describe('PettyCashReplenishmentCopySourceService', () => {
  const service = new PettyCashReplenishmentCopySourceService({} as PrismaService);

  it('formats PCR reference correctly', () => {
    expect(formatPettyCashReplenishmentReference('PCR-2026-0001')).toBe('PCR:PCR-2026-0001');
  });

  it('parses valid PCR reference correctly', () => {
    expect(parsePettyCashReplenishmentReference('PCR:PCR-2026-0001')).toBe('PCR-2026-0001');
  });

  it('throws BadRequestException for invalid PCR reference', () => {
    expect(() => parsePettyCashReplenishmentReference('INVALID:123')).toThrow(BadRequestException);
    expect(() => parsePettyCashReplenishmentReference('PCR:')).toThrow(BadRequestException);
  });

  it('extracts copied voucher detail amounts and ignores generated rows', () => {
    const allocations = service.getCopiedVoucherDetailAmounts([
      { refId: 'PCR:PCR-2026-0001', grossAmount: 4000, disburseAmount: 3800 },
      { refId: 'PCR:PCR-2026-0001', grossAmount: 2000, disburseAmount: 1900 },
      { id: 'auto-cash', accountTitle: 'Cash on Hand', debit: 0, credit: 5700 },
    ]);

    expect(allocations).toEqual([{ reference: 'PCR:PCR-2026-0001', grossAmount: 6000, disburseAmount: 5700 }]);
  });
});
