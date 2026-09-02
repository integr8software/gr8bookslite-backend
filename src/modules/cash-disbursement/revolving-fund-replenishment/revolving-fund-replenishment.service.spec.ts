import { BadRequestException } from '@nestjs/common';
import { Prisma, RevolvingFundReplenishmentStatus } from '@prisma/client';
import { CompanyCurrencyService } from '../../../common/currency/company-currency.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { RevolvingFundReplenishmentService } from './revolving-fund-replenishment.service';

type RevolvingFundReplenishmentServiceInternals = {
  isSubmittedStatus: (status: RevolvingFundReplenishmentStatus) => boolean;
  assertRevolvingFundReplenishmentReady: (record: {
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

describe('RevolvingFundReplenishmentService', () => {
  const service = new RevolvingFundReplenishmentService(
    {} as PrismaService,
    {} as CompanyCurrencyService,
  ) as unknown as RevolvingFundReplenishmentServiceInternals;

  it('treats only submitted statuses as requiring complete data', () => {
    expect(service.isSubmittedStatus(RevolvingFundReplenishmentStatus.FOR_APPROVAL)).toBe(true);
    expect(service.isSubmittedStatus(RevolvingFundReplenishmentStatus.APPROVED)).toBe(true);
    expect(service.isSubmittedStatus(RevolvingFundReplenishmentStatus.POSTED)).toBe(true);
    expect(service.isSubmittedStatus(RevolvingFundReplenishmentStatus.DRAFT)).toBe(false);
    expect(service.isSubmittedStatus(RevolvingFundReplenishmentStatus.CANCELLED)).toBe(false);
  });

  it('requires party, account, positive amount, and one valid detail before submission', () => {
    expect(() =>
      service.assertRevolvingFundReplenishmentReady({
        partyCodeSnapshot: 'EMP-001',
        partyNameSnapshot: 'Employee',
        accountCodeSnapshot: '1010',
        accountTitleSnapshot: 'Revolving Fund',
        amount: new Prisma.Decimal('100'),
        details: [{ supplierNameSnapshot: 'Supplier', amount: new Prisma.Decimal('50') }],
      }),
    ).not.toThrow();

    expect(() =>
      service.assertRevolvingFundReplenishmentReady({
        partyCodeSnapshot: 'EMP-001',
        partyNameSnapshot: 'Employee',
        accountCodeSnapshot: '',
        accountTitleSnapshot: 'Revolving Fund',
        amount: new Prisma.Decimal('100'),
        details: [{ supplierNameSnapshot: 'Supplier', amount: new Prisma.Decimal('50') }],
      }),
    ).toThrow(BadRequestException);
  });
});
