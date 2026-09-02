import { Prisma, RevolvingFundStatus } from '@prisma/client';
import { RevolvingFundMapper } from './revolving-fund.mapper';
import type { RevolvingFundWithDetails } from '../types/revolving-fund-with-details.type';

describe('RevolvingFundMapper', () => {
  it('maps fund header and detail relation fallbacks for API responses', () => {
    const mapped = RevolvingFundMapper.toResponseDto({
      id: 15n,
      companyId: 1,
      branchUnitId: 2,
      transactionNo: 'RF-2026-000001',
      documentDate: new Date('2026-06-11T00:00:00.000Z'),
      partyId: 27n,
      partyCodeSnapshot: '',
      partyNameSnapshot: '',
      party: { partyCodeNo: 'EMP-001', partyName: 'Employee Name' },
      creditAccountId: 35n,
      accountCodeSnapshot: '',
      accountTitleSnapshot: '',
      creditAccount: { accountCode: '1011', accountTitle: 'Revolving Fund Account' },
      responsibilityCenterId: 47n,
      responsibilityCenterCodeSnapshot: '',
      responsibilityCenterSnapshot: '',
      responsibilityCenter: { code: 'OPS', name: 'Operations' },
      projectCode: 'PRJ',
      projectName: 'Project',
      currencyCode: 'PHP',
      exchangeRate: new Prisma.Decimal('1.25'),
      amount: new Prisma.Decimal('100'),
      remarks: null,
      status: RevolvingFundStatus.DRAFT,
      details: [
        {
          id: 150n,
          lineNumber: 1,
          date: new Date('2026-06-12T00:00:00.000Z'),
          partyId: 28n,
          supplierCodeSnapshot: '',
          supplierNameSnapshot: '',
          party: { partyCodeNo: 'SUP-001', partyName: 'Supplier Name' },
          orNo: 'OR-1',
          tinNo: 'TIN',
          particulars: 'Supplies',
          remarks: null,
          amount: new Prisma.Decimal('50'),
          grossAmount: new Prisma.Decimal('56'),
          netAmount: new Prisma.Decimal('50'),
          disburseAmount: new Prisma.Decimal('55'),
          vatType: 'VAT Inclusive',
          vatPercent: new Prisma.Decimal('12'),
          vatAmount: new Prisma.Decimal('6'),
          ewtCode: 'EWT',
          ewtPercent: new Prisma.Decimal('2'),
          ewtAmount: new Prisma.Decimal('1'),
          expenseType: 'Supplies',
          responsibilityCenterId: 48n,
          responsibilityCenterCodeSnapshot: '',
          responsibilityCenterSnapshot: '',
          responsibilityCenter: { code: 'FIN', name: 'Finance' },
        },
      ],
      createdAt: new Date('2026-06-11T08:30:00.000Z'),
      updatedAt: new Date('2026-06-12T08:30:00.000Z'),
    } as unknown as RevolvingFundWithDetails);

    expect(mapped).toEqual(expect.objectContaining({ id: '15', partyCode: 'EMP-001', accountTitle: 'Revolving Fund Account' }));
    expect(mapped.details?.[0]).toEqual(
      expect.objectContaining({
        id: '150',
        date: '2026-06-12',
        supplierCode: 'SUP-001',
        supplierName: 'Supplier Name',
        responsibilityCenterCode: 'FIN',
        responsibilityCenter: 'Finance',
        grossAmount: 56,
      }),
    );
  });
});
