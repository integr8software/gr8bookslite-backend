import { BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import {
  AdvanceToSupplierCopySourceService,
  formatAdvanceToSupplierReference,
  parseAdvanceToSupplierReference,
} from './advance-to-supplier-copy-source.service';

describe('AdvanceToSupplierCopySourceService', () => {
  const service = new AdvanceToSupplierCopySourceService({} as PrismaService);
  const getCopiedVoucherDetailAmounts = (
    service as unknown as {
      getCopiedVoucherDetailAmounts: (details: Array<Record<string, unknown>>) => Array<{
        reference: string;
        grossAmount: number;
        disburseAmount: number;
      }>;
    }
  ).getCopiedVoucherDetailAmounts.bind(service);

  it('formats ATS reference correctly', () => {
    expect(formatAdvanceToSupplierReference('ATS-2026-0001')).toBe('ATS:ATS-2026-0001');
  });

  it('parses valid ATS reference correctly', () => {
    expect(parseAdvanceToSupplierReference('ATS:ATS-2026-0001')).toBe('ATS-2026-0001');
  });

  it('throws BadRequestException for invalid ATS reference', () => {
    expect(() => parseAdvanceToSupplierReference('INVALID:123')).toThrow(BadRequestException);
    expect(() => parseAdvanceToSupplierReference('ATS:')).toThrow(BadRequestException);
  });

  it('extracts copied voucher detail amounts and ignores generated rows', () => {
    const allocations = getCopiedVoucherDetailAmounts([
      { refId: 'ATS:ATS-2026-0001', grossAmount: 10000, disburseAmount: 10000 },
      { refId: 'ATS:ATS-2026-0001', grossAmount: 5000, disburseAmount: 5000 },
      { id: 'auto-vat', accountTitle: 'Input VAT', debit: 1200, credit: 0 },
    ]);

    expect(allocations).toEqual([{ reference: 'ATS:ATS-2026-0001', grossAmount: 15000, disburseAmount: 15000 }]);
  });
});
