import { BadRequestException } from '@nestjs/common';
import { CashAdvanceStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateCashAdvanceDto } from './dto/cash-advance.dto';
import { CashAdvanceService, getBatchTransNo } from './cash-advance.service';

type CashAdvanceServiceInternals = {
  isSubmittedStatus: (status: CashAdvanceStatus) => boolean;
  assertCashAdvanceDtoReady: (dto: CreateCashAdvanceDto) => void;
};

describe('CashAdvanceService', () => {
  const service = new CashAdvanceService({} as PrismaService) as unknown as CashAdvanceServiceInternals;

  it('treats only submitted statuses as requiring complete data', () => {
    expect(service.isSubmittedStatus(CashAdvanceStatus.FOR_APPROVAL)).toBe(true);
    expect(service.isSubmittedStatus(CashAdvanceStatus.POSTED)).toBe(true);
    expect(service.isSubmittedStatus(CashAdvanceStatus.DRAFT)).toBe(false);
    expect(service.isSubmittedStatus(CashAdvanceStatus.CANCELLED)).toBe(false);
  });

  it('requires a default account and at least one complete non-zero row before submission', () => {
    expect(() =>
      service.assertCashAdvanceDtoReady({
        documentDate: '2026-09-01',
        accountCode: '1300',
        items: [{ partyCode: 'EMP-001', partyName: 'Employee', amount: '100.00' }],
      }),
    ).not.toThrow();

    expect(() =>
      service.assertCashAdvanceDtoReady({
        documentDate: '2026-09-01',
        accountCode: '1300',
        items: [{ partyCode: 'EMP-001', partyName: 'Employee', amount: '0.00' }],
      }),
    ).toThrow(BadRequestException);
  });

  it('resolves line transaction numbers to the parent CA transaction number', () => {
    expect(getBatchTransNo('CA-000001-L001')).toBe('CA-000001');
    expect(getBatchTransNo('CA-000001-L002')).toBe('CA-000001');
    expect(getBatchTransNo('CA-2026-000001-L002')).toBe('CA-2026-000001');
    expect(getBatchTransNo('CAME-2026-000001-L002')).toBe('CAME-2026-000001');
  });
});
