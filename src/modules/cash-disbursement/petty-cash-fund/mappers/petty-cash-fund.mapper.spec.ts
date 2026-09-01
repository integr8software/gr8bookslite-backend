import { PettyCashFundStatus, Prisma } from '@prisma/client';
import { PettyCashFundMapper } from './petty-cash-fund.mapper';
import type { PettyCashFundWithDetails } from '../types/petty-cash-fund-with-details.type';

describe('PettyCashFundMapper', () => {
  it('maps fund header and detail relation fallbacks for API responses', () => {
    const mapped = PettyCashFundMapper.toResponseDto({
      id: 13n,
      companyId: 1,
      branchUnitId: 2,
      transactionNo: 'PCF-2026-000001',
      documentDate: new Date('2026-06-11T00:00:00.000Z'),
      partyId: 23n,
      partyCodeSnapshot: 'CUST-SNAP',
      partyNameSnapshot: 'Custodian Snapshot',
      party: { partyCodeNo: 'CUST-001', partyName: 'Custodian Name' },
      creditAccountId: 33n,
      accountCodeSnapshot: '1010',
      accountTitleSnapshot: 'Petty Cash',
      creditAccount: { accountCode: '1011', accountTitle: 'Petty Cash Account' },
      responsibilityCenterId: 43n,
      responsibilityCenterCodeSnapshot: 'OPS-SNAP',
      responsibilityCenterSnapshot: 'Ops Snapshot',
      responsibilityCenter: { code: 'OPS', name: 'Operations' },
      projectCode: 'PRJ',
      projectName: 'Project',
      currencyCode: 'PHP',
      exchangeRate: new Prisma.Decimal('1.25'),
      amount: new Prisma.Decimal('100'),
      remarks: null,
      status: PettyCashFundStatus.DRAFT,
      details: [
        {
          id: 130n,
          lineNumber: 1,
          date: new Date('2026-06-12T00:00:00.000Z'),
          partyId: 24n,
          supplierCodeSnapshot: '',
          supplierNameSnapshot: '',
          party: { partyCodeNo: 'SUP-001', partyName: 'Supplier Name' },
          orNo: 'OR-1',
          tinNo: 'TIN',
          particulars: 'Meal',
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
          expenseType: 'Meals',
          responsibilityCenterId: 44n,
          responsibilityCenterCodeSnapshot: '',
          responsibilityCenterSnapshot: '',
          responsibilityCenter: { code: 'FIN', name: 'Finance' },
        },
      ],
      createdAt: new Date('2026-06-11T08:30:00.000Z'),
      updatedAt: new Date('2026-06-12T08:30:00.000Z'),
    } as unknown as PettyCashFundWithDetails);

    expect(mapped).toEqual(expect.objectContaining({ id: '13', partyCode: 'CUST-001', accountId: '33', exchangeRate: 1.25 }));
    expect(mapped.details?.[0]).toEqual(
      expect.objectContaining({
        id: '130',
        date: '2026-06-12',
        partyId: '24',
        supplierCode: 'SUP-001',
        supplierName: 'Supplier Name',
        responsibilityCenterId: '44',
        responsibilityCenterCode: 'FIN',
        responsibilityCenter: 'Finance',
        grossAmount: 56,
        disburseAmount: 55,
      }),
    );
  });
});
