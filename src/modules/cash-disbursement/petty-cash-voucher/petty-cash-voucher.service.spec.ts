import { BadRequestException } from '@nestjs/common';
import { PettyCashVoucherStatus, Prisma } from '@prisma/client';
import { CompanyCurrencyService } from '../../../common/currency/company-currency.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { PettyCashVoucherService } from './petty-cash-voucher.service';

type PettyCashVoucherServiceInternals = {
  isSubmittedStatus: (status: PettyCashVoucherStatus) => boolean;
  assertPettyCashVoucherReady: (record: {
    partyCodeSnapshot: string | null;
    partyNameSnapshot: string | null;
    accountCodeSnapshot: string | null;
    accountTitleSnapshot: string | null;
    grossAmount: Prisma.Decimal;
  }) => void;
};

describe('PettyCashVoucherService', () => {
  const service = new PettyCashVoucherService({} as PrismaService, {} as CompanyCurrencyService) as unknown as PettyCashVoucherServiceInternals;

  it('treats only submitted statuses as requiring complete data', () => {
    expect(service.isSubmittedStatus(PettyCashVoucherStatus.FOR_APPROVAL)).toBe(true);
    expect(service.isSubmittedStatus(PettyCashVoucherStatus.APPROVED)).toBe(true);
    expect(service.isSubmittedStatus(PettyCashVoucherStatus.POSTED)).toBe(true);
    expect(service.isSubmittedStatus(PettyCashVoucherStatus.DRAFT)).toBe(false);
    expect(service.isSubmittedStatus(PettyCashVoucherStatus.CANCELLED)).toBe(false);
  });

  it('requires party, account, and positive gross amount before submission', () => {
    expect(() =>
      service.assertPettyCashVoucherReady({
        partyCodeSnapshot: 'EMP-001',
        partyNameSnapshot: 'Employee',
        accountCodeSnapshot: '1010',
        accountTitleSnapshot: 'Petty Cash',
        grossAmount: new Prisma.Decimal('100'),
      }),
    ).not.toThrow();

    expect(() =>
      service.assertPettyCashVoucherReady({
        partyCodeSnapshot: 'EMP-001',
        partyNameSnapshot: 'Employee',
        accountCodeSnapshot: '1010',
        accountTitleSnapshot: 'Petty Cash',
        grossAmount: new Prisma.Decimal('0'),
      }),
    ).toThrow(BadRequestException);
  });
});
