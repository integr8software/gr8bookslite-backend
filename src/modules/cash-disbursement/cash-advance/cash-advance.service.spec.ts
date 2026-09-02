import { BadRequestException } from '@nestjs/common';
import { CashAdvanceStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { TablePreferencesService } from '../../table-preferences/table-preferences.service';
import { CashAdvanceService } from './cash-advance.service';

type CashAdvanceServiceInternals = {
  isSubmittedStatus: (status: CashAdvanceStatus) => boolean;
  assertCashAdvanceReady: (record: {
    partyCodeSnapshot: string | null;
    partyNameSnapshot: string | null;
    accountCodeSnapshot: string | null;
    amount: Prisma.Decimal;
  }) => void;
};

describe('CashAdvanceService', () => {
  const service = new CashAdvanceService({} as PrismaService, {} as TablePreferencesService) as unknown as CashAdvanceServiceInternals;

  it('treats only submitted statuses as requiring complete data', () => {
    expect(service.isSubmittedStatus(CashAdvanceStatus.FOR_APPROVAL)).toBe(true);
    expect(service.isSubmittedStatus(CashAdvanceStatus.APPROVED)).toBe(true);
    expect(service.isSubmittedStatus(CashAdvanceStatus.POSTED)).toBe(true);
    expect(service.isSubmittedStatus(CashAdvanceStatus.DRAFT)).toBe(false);
    expect(service.isSubmittedStatus(CashAdvanceStatus.CANCELLED)).toBe(false);
  });

  it('requires party, account, and positive amount before submission', () => {
    expect(() =>
      service.assertCashAdvanceReady({
        partyCodeSnapshot: 'EMP-001',
        partyNameSnapshot: 'Employee',
        accountCodeSnapshot: '1300',
        amount: new Prisma.Decimal('100'),
      }),
    ).not.toThrow();

    expect(() =>
      service.assertCashAdvanceReady({
        partyCodeSnapshot: 'EMP-001',
        partyNameSnapshot: 'Employee',
        accountCodeSnapshot: '',
        amount: new Prisma.Decimal('100'),
      }),
    ).toThrow(BadRequestException);
  });
});
