import { BadRequestException } from '@nestjs/common';
import { PettyCashReplenishmentStatus, Prisma } from '@prisma/client';
import { CompanyCurrencyService } from '../../../common/currency/company-currency.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { PettyCashReplenishmentService } from './petty-cash-replenishment.service';

type PettyCashReplenishmentServiceInternals = {
  isSubmittedStatus: (status: PettyCashReplenishmentStatus) => boolean;
  assertUniquePettyCashVoucherNumbers: (details?: Array<{ pettyCashNo?: string; voucherNo?: string }>) => void;
  assertPettyCashReplenishmentReady: (record: {
    partyCodeSnapshot: string | null;
    partyNameSnapshot: string | null;
    accountCodeSnapshot: string | null;
    accountTitleSnapshot: string | null;
    amount: Prisma.Decimal;
    details?: Array<{
      supplierNameSnapshot: string | null;
      amount: Prisma.Decimal;
    }>;
  }) => void;
};

describe('PettyCashReplenishmentService', () => {
  const service = new PettyCashReplenishmentService({} as PrismaService, {} as CompanyCurrencyService) as unknown as PettyCashReplenishmentServiceInternals;

  it('treats only submitted statuses as requiring complete data', () => {
    expect(service.isSubmittedStatus(PettyCashReplenishmentStatus.FOR_APPROVAL)).toBe(true);
    expect(service.isSubmittedStatus(PettyCashReplenishmentStatus.POSTED)).toBe(true);
    expect(service.isSubmittedStatus(PettyCashReplenishmentStatus.POSTED)).toBe(true);
    expect(service.isSubmittedStatus(PettyCashReplenishmentStatus.DRAFT)).toBe(false);
    expect(service.isSubmittedStatus(PettyCashReplenishmentStatus.CANCELLED)).toBe(false);
  });

  it('requires party, account, positive amount, and one valid detail before submission', () => {
    expect(() =>
      service.assertPettyCashReplenishmentReady({
        partyCodeSnapshot: 'EMP-001',
        partyNameSnapshot: 'Employee',
        accountCodeSnapshot: '1010',
        accountTitleSnapshot: 'Petty Cash',
        amount: new Prisma.Decimal('100'),
        details: [{ supplierNameSnapshot: 'Supplier', amount: new Prisma.Decimal('50') }],
      }),
    ).not.toThrow();

    expect(() =>
      service.assertPettyCashReplenishmentReady({
        partyCodeSnapshot: 'EMP-001',
        partyNameSnapshot: 'Employee',
        accountCodeSnapshot: '1010',
        accountTitleSnapshot: 'Petty Cash',
        amount: new Prisma.Decimal('100'),
        details: [{ supplierNameSnapshot: '', amount: new Prisma.Decimal('50') }],
      }),
    ).toThrow(BadRequestException);
  });

  it('ignores non-PCV references but requires unique Petty Cash Voucher numbers', () => {
    expect(() => service.assertUniquePettyCashVoucherNumbers([{ pettyCashNo: 'RF:RF-000001' }, { voucherNo: 'rf:RF-000001' }])).not.toThrow();

    expect(() => service.assertUniquePettyCashVoucherNumbers([{ pettyCashNo: 'PCV:PCV-000001' }, { voucherNo: 'pcv:PCV-000001' }])).toThrow(
      'Petty Cash Voucher Numbers must be unique.',
    );
  });
});
