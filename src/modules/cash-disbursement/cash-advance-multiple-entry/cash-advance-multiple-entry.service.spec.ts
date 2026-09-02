import { BadRequestException } from '@nestjs/common';
import { CashAdvanceStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateCashAdvanceMultipleEntryDto } from './dto/cash-advance-multiple-entry.dto';
import { CashAdvanceMultipleEntryService, getBatchTransNo } from './cash-advance-multiple-entry.service';

type CashAdvanceMultipleEntryServiceInternals = {
  isSubmittedStatus: (status: CashAdvanceStatus) => boolean;
  assertCashAdvanceMultipleEntryDtoReady: (dto: CreateCashAdvanceMultipleEntryDto) => void;
};

describe('CashAdvanceMultipleEntryService', () => {
  const service = new CashAdvanceMultipleEntryService({} as PrismaService) as unknown as CashAdvanceMultipleEntryServiceInternals;

  it('treats only submitted statuses as requiring complete data', () => {
    expect(service.isSubmittedStatus(CashAdvanceStatus.FOR_APPROVAL)).toBe(true);
    expect(service.isSubmittedStatus(CashAdvanceStatus.APPROVED)).toBe(true);
    expect(service.isSubmittedStatus(CashAdvanceStatus.POSTED)).toBe(true);
    expect(service.isSubmittedStatus(CashAdvanceStatus.DRAFT)).toBe(false);
    expect(service.isSubmittedStatus(CashAdvanceStatus.CANCELLED)).toBe(false);
  });

  it('requires a default account and at least one complete non-zero row before submission', () => {
    expect(() =>
      service.assertCashAdvanceMultipleEntryDtoReady({
        documentDate: '2026-09-01',
        accountCode: '1300',
        items: [{ partyCode: 'EMP-001', partyName: 'Employee', amount: '100.00' }],
      }),
    ).not.toThrow();

    expect(() =>
      service.assertCashAdvanceMultipleEntryDtoReady({
        documentDate: '2026-09-01',
        accountCode: '1300',
        items: [{ partyCode: 'EMP-001', partyName: 'Employee', amount: '0.00' }],
      }),
    ).toThrow(BadRequestException);
  });

  it('resolves line transaction numbers to the parent CAME transaction number', () => {
    expect(getBatchTransNo('CAME-000001-L001')).toBe('CAME-000001');
    expect(getBatchTransNo('CAME-000001-L002')).toBe('CAME-000001');
    expect(getBatchTransNo('CAME-2026-000001-L002')).toBe('CAME-2026-000001');
  });
});
