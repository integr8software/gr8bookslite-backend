import { PettyCashReplenishmentStatus, Prisma } from '@prisma/client';
import { PettyCashReplenishmentMapper } from './petty-cash-replenishment.mapper';
import type { PettyCashReplenishmentWithDetails } from '../types/petty-cash-replenishment-with-details.type';

describe('PettyCashReplenishmentMapper', () => {
  it('maps replenishment header and line aliases for API responses', () => {
    const mapped = PettyCashReplenishmentMapper.toResponseDto({
      id: 14n,
      companyId: 1,
      branchUnitId: 2,
      transactionNo: 'PCR-2026-000001',
      documentDate: new Date('2026-06-11T00:00:00.000Z'),
      partyId: 25n,
      partyCodeSnapshot: '',
      partyNameSnapshot: '',
      party: { partyCodeNo: 'EMP-001', partyName: 'Employee Name' },
      creditAccountId: 34n,
      accountCodeSnapshot: '',
      accountTitleSnapshot: '',
      creditAccount: { accountCode: '1011', accountTitle: 'Petty Cash Account' },
      responsibilityCenterId: 45n,
      responsibilityCenterCodeSnapshot: '',
      responsibilityCenterSnapshot: '',
      responsibilityCenter: { code: 'OPS', name: 'Operations' },
      projectCode: 'PRJ',
      projectName: 'Project',
      currencyCode: 'PHP',
      exchangeRate: new Prisma.Decimal('1.25'),
      amount: new Prisma.Decimal('100'),
      remarks: null,
      status: PettyCashReplenishmentStatus.DRAFT,
      details: [
        {
          id: 140n,
          lineNumber: 1,
          pettyCashDate: new Date('2026-06-12T00:00:00.000Z'),
          pettyCashNo: 'PCV-1',
          partyId: 26n,
          supplierCodeSnapshot: '',
          supplierNameSnapshot: '',
          party: { partyCodeNo: 'SUP-001', partyName: 'Supplier Name' },
          particulars: 'Fuel',
          remarks: null,
          amount: new Prisma.Decimal('50'),
          netAmount: new Prisma.Decimal('50'),
          vatType: 'VAT Inclusive',
          vatPercent: new Prisma.Decimal('12'),
          vatAmount: new Prisma.Decimal('6'),
          ewtCode: 'EWT',
          ewtPercent: new Prisma.Decimal('2'),
          ewtAmount: new Prisma.Decimal('1'),
          disburseAmount: new Prisma.Decimal('55'),
          responsibilityCenterId: 46n,
          responsibilityCenterCodeSnapshot: '',
          responsibilityCenterSnapshot: '',
          responsibilityCenter: { code: 'FIN', name: 'Finance' },
        },
      ],
      createdAt: new Date('2026-06-11T08:30:00.000Z'),
      updatedAt: new Date('2026-06-12T08:30:00.000Z'),
    } as unknown as PettyCashReplenishmentWithDetails);

    expect(mapped).toEqual(expect.objectContaining({ id: '14', partyCode: 'EMP-001', accountCode: '1011', amount: 100 }));
    expect(mapped.details?.[0]).toEqual(
      expect.objectContaining({
        id: '140',
        pettyCashDate: '2026-06-12',
        date: '2026-06-12',
        pettyCashNo: 'PCV-1',
        voucherNo: 'PCV-1',
        supplierCode: 'SUP-001',
        supplierName: 'Supplier Name',
        responsibilityCenterCode: 'FIN',
        responsibilityCenter: 'Finance',
        disburseAmount: 55,
      }),
    );
  });
});
