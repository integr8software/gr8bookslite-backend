import { Prisma, RevolvingFundReplenishmentStatus } from '@prisma/client';
import { RevolvingFundReplenishmentMapper } from './revolving-fund-replenishment.mapper';
import type { RevolvingFundReplenishmentWithDetails } from '../types/revolving-fund-replenishment-with-details.type';

describe('RevolvingFundReplenishmentMapper', () => {
  it('maps replenishment header and revolving-fund line aliases for API responses', () => {
    const mapped = RevolvingFundReplenishmentMapper.toResponseDto({
      id: 16n,
      companyId: 1,
      branchUnitId: 2,
      transactionNo: 'RFR-2026-000001',
      documentDate: new Date('2026-06-11T00:00:00.000Z'),
      partyId: 29n,
      partyCodeSnapshot: '',
      partyNameSnapshot: '',
      party: { partyCodeNo: 'EMP-001', partyName: 'Employee Name' },
      creditAccountId: 36n,
      accountCodeSnapshot: '',
      accountTitleSnapshot: '',
      creditAccount: { accountCode: '1011', accountTitle: 'Revolving Fund Account' },
      responsibilityCenterId: 49n,
      responsibilityCenterCodeSnapshot: '',
      responsibilityCenterSnapshot: '',
      responsibilityCenter: { code: 'OPS', name: 'Operations' },
      projectCode: 'PRJ',
      projectName: 'Project',
      currencyCode: 'PHP',
      exchangeRate: new Prisma.Decimal('1.25'),
      amount: new Prisma.Decimal('100'),
      remarks: null,
      status: RevolvingFundReplenishmentStatus.DRAFT,
      details: [
        {
          id: 160n,
          lineNumber: 1,
          revolvingFundDate: new Date('2026-06-12T00:00:00.000Z'),
          revolvingFundNo: 'RF-1',
          partyId: 30n,
          supplierCodeSnapshot: '',
          supplierNameSnapshot: '',
          party: { partyCodeNo: 'SUP-001', partyName: 'Supplier Name' },
          particulars: 'Supplies',
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
          responsibilityCenterId: 50n,
          responsibilityCenterCodeSnapshot: '',
          responsibilityCenterSnapshot: '',
          responsibilityCenter: { code: 'FIN', name: 'Finance' },
        },
      ],
      createdAt: new Date('2026-06-11T08:30:00.000Z'),
      updatedAt: new Date('2026-06-12T08:30:00.000Z'),
    } as unknown as RevolvingFundReplenishmentWithDetails);

    expect(mapped).toEqual(expect.objectContaining({ id: '16', partyCode: 'EMP-001', accountTitle: 'Revolving Fund Account' }));
    expect(mapped.details?.[0]).toEqual(
      expect.objectContaining({
        id: '160',
        revolvingFundDate: '2026-06-12',
        date: '2026-06-12',
        revolvingFundNo: 'RF-1',
        voucherNo: 'RF-1',
        supplierCode: 'SUP-001',
        supplierName: 'Supplier Name',
        responsibilityCenterCode: 'FIN',
        responsibilityCenter: 'Finance',
      }),
    );
  });
});
