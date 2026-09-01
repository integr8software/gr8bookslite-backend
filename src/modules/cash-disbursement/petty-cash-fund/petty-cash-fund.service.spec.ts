import { BadRequestException } from '@nestjs/common';
import { PettyCashFundStatus, Prisma } from '@prisma/client';
import { CompanyCurrencyService } from '../../../common/currency/company-currency.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { PettyCashFundService } from './petty-cash-fund.service';

type PettyCashFundServiceInternals = {
  isSubmittedStatus: (status: PettyCashFundStatus) => boolean;
  assertPettyCashFundReady: (record: {
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

describe('PettyCashFundService', () => {
  const service = new PettyCashFundService({} as PrismaService, {} as CompanyCurrencyService) as unknown as PettyCashFundServiceInternals;

  it('treats only submitted statuses as requiring complete data', () => {
    expect(service.isSubmittedStatus(PettyCashFundStatus.FOR_APPROVAL)).toBe(true);
    expect(service.isSubmittedStatus(PettyCashFundStatus.APPROVED)).toBe(true);
    expect(service.isSubmittedStatus(PettyCashFundStatus.POSTED)).toBe(true);
    expect(service.isSubmittedStatus(PettyCashFundStatus.DRAFT)).toBe(false);
    expect(service.isSubmittedStatus(PettyCashFundStatus.CANCELLED)).toBe(false);
  });

  it('requires party, account, positive amount, and one valid detail before submission', () => {
    expect(() =>
      service.assertPettyCashFundReady({
        partyCodeSnapshot: 'EMP-001',
        partyNameSnapshot: 'Employee',
        accountCodeSnapshot: '1010',
        accountTitleSnapshot: 'Petty Cash',
        amount: new Prisma.Decimal('100'),
        details: [{ supplierNameSnapshot: 'Supplier', grossAmount: new Prisma.Decimal('50'), amount: new Prisma.Decimal('50') }],
      }),
    ).not.toThrow();

    expect(() =>
      service.assertPettyCashFundReady({
        partyCodeSnapshot: 'EMP-001',
        partyNameSnapshot: 'Employee',
        accountCodeSnapshot: '1010',
        accountTitleSnapshot: 'Petty Cash',
        amount: new Prisma.Decimal('100'),
        details: [],
      }),
    ).toThrow(BadRequestException);
  });
});
