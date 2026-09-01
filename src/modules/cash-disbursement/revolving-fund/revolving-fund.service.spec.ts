import { BadRequestException } from '@nestjs/common';
import { Prisma, RevolvingFundStatus } from '@prisma/client';
import { CompanyCurrencyService } from '../../../common/currency/company-currency.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { RevolvingFundService } from './revolving-fund.service';

type RevolvingFundServiceInternals = {
  isSubmittedStatus: (status: RevolvingFundStatus) => boolean;
  assertRevolvingFundReady: (record: {
    partyCodeSnapshot: string | null;
    partyNameSnapshot: string | null;
    accountCodeSnapshot: string | null;
    accountTitleSnapshot: string | null;
    amount: Prisma.Decimal;
    details?: Array<{
      supplierNameSnapshot: string | null;
      grossAmount: Prisma.Decimal;
      amount: Prisma.Decimal;
    }>;
  }) => void;
};

describe('RevolvingFundService', () => {
  const service = new RevolvingFundService({} as PrismaService, {} as CompanyCurrencyService) as unknown as RevolvingFundServiceInternals;

  it('treats only submitted statuses as requiring complete data', () => {
    expect(service.isSubmittedStatus(RevolvingFundStatus.FOR_APPROVAL)).toBe(true);
    expect(service.isSubmittedStatus(RevolvingFundStatus.APPROVED)).toBe(true);
    expect(service.isSubmittedStatus(RevolvingFundStatus.POSTED)).toBe(true);
    expect(service.isSubmittedStatus(RevolvingFundStatus.DRAFT)).toBe(false);
    expect(service.isSubmittedStatus(RevolvingFundStatus.CANCELLED)).toBe(false);
  });

  it('requires party, account, positive amount, and one valid detail before submission', () => {
    expect(() =>
      service.assertRevolvingFundReady({
        partyCodeSnapshot: 'EMP-001',
        partyNameSnapshot: 'Employee',
        accountCodeSnapshot: '1010',
        accountTitleSnapshot: 'Revolving Fund',
        amount: new Prisma.Decimal('100'),
        details: [{ supplierNameSnapshot: 'Supplier', grossAmount: new Prisma.Decimal('50'), amount: new Prisma.Decimal('50') }],
      }),
    ).not.toThrow();

    expect(() =>
      service.assertRevolvingFundReady({
        partyCodeSnapshot: 'EMP-001',
        partyNameSnapshot: 'Employee',
        accountCodeSnapshot: '1010',
        accountTitleSnapshot: 'Revolving Fund',
        amount: new Prisma.Decimal('0'),
        details: [{ supplierNameSnapshot: 'Supplier', grossAmount: new Prisma.Decimal('50'), amount: new Prisma.Decimal('50') }],
      }),
    ).toThrow(BadRequestException);
  });
});
