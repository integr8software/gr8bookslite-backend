import { PettyCashVoucherStatus, Prisma } from '@prisma/client';
import { PettyCashVoucherMapper } from './petty-cash-voucher.mapper';
import type { PettyCashVoucherWithDetails } from '../types/petty-cash-voucher-with-details.type';

describe('PettyCashVoucherMapper', () => {
  it('maps voucher aliases, relation fallbacks, date, and decimal values', () => {
    const mapped = PettyCashVoucherMapper.toResponseDto({
      id: 12n,
      companyId: 1,
      branchUnitId: 2,
      voucherNo: 'PCV-2026-000001',
      documentDate: new Date('2026-06-11T00:00:00.000Z'),
      partyId: 22n,
      partyCodeSnapshot: 'EMP-SNAP',
      partyNameSnapshot: 'Employee Snapshot',
      party: { partyCodeNo: 'EMP-002', partyName: 'Employee Name' },
      creditAccountId: 32n,
      accountCodeSnapshot: '1010',
      accountTitleSnapshot: 'Petty Cash',
      creditAccount: { accountCode: '1011', accountTitle: 'Petty Cash Account' },
      responsibilityCenterId: 42n,
      responsibilityCenterCodeSnapshot: 'OPS-SNAP',
      responsibilityCenterSnapshot: 'Ops Snapshot',
      responsibilityCenter: { code: 'OPS', name: 'Operations' },
      projectCode: 'PRJ',
      projectName: 'Project',
      currencyCode: 'PHP',
      exchangeRate: new Prisma.Decimal('1.25'),
      amount: new Prisma.Decimal('100'),
      grossAmount: new Prisma.Decimal('112'),
      netAmount: new Prisma.Decimal('100'),
      vatType: 'VAT Inclusive',
      vatable: true,
      vatRate: '12%',
      vatPercent: new Prisma.Decimal('12'),
      vatAmount: new Prisma.Decimal('12'),
      ewtCode: 'EWT',
      ewtRate: '2%',
      ewtPercent: new Prisma.Decimal('2'),
      ewtAmount: new Prisma.Decimal('2'),
      remarks: 'Office supplies',
      status: PettyCashVoucherStatus.DRAFT,
      createdAt: new Date('2026-06-11T08:30:00.000Z'),
      updatedAt: new Date('2026-06-12T08:30:00.000Z'),
    } as unknown as PettyCashVoucherWithDetails);

    expect(mapped).toEqual(
      expect.objectContaining({
        id: '12',
        voucherNo: 'PCV-2026-000001',
        transactionNo: 'PCV-2026-000001',
        documentDate: '2026-06-11',
        partyId: '22',
        partyCode: 'EMP-002',
        partyName: 'Employee Name',
        creditAccountId: '32',
        accountId: '32',
        accountCode: '1011',
        accountTitle: 'Petty Cash Account',
        responsibilityCenterId: '42',
        responsibilityCenterCode: 'OPS',
        responsibilityCenter: 'Operations',
        exchangeRate: 1.25,
        grossAmount: 112,
        vatPercent: 12,
        ewtAmount: 2,
      }),
    );
  });
});
