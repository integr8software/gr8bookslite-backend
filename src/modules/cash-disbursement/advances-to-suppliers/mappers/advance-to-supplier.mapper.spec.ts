import { AdvanceToSupplierPaymentType, AdvanceToSupplierStatus, Prisma } from '@prisma/client';
import { SystemGeneratedAuditLabel } from '../../../../common/utils/audit-user.util';
import type { AdvanceToSupplierWithPayload } from '../prisma/advance-to-supplier.include';
import { mapAdvanceToSupplier } from './advance-to-supplier.mapper';

describe('mapAdvanceToSupplier', () => {
  it('maps snapshots, decimals, dates, and audit user names for API responses', () => {
    const mapped = mapAdvanceToSupplier(
      {
        id: 10n,
        transNo: 'ATS-2026-000001',
        documentDate: new Date('2026-06-11T00:00:00.000Z'),
        partyId: 20n,
        partyCodeSnapshot: '',
        partyNameSnapshot: '',
        party: { partyCodeNo: 'SUP-001', partyName: 'Office Supplier' },
        creditAccount: { accountCode: '1100', accountTitle: 'Advances to Suppliers' },
        accountCodeSnapshot: '',
        accountTitleSnapshot: '',
        responsibilityCenterSnapshot: 'Operations',
        responsibilityCenterCodeSnapshot: 'OPS',
        projectNameSnapshot: 'Branch Opening',
        projectCodeSnapshot: 'BR-01',
        currencyCode: 'PHP',
        exchangeRate: new Prisma.Decimal('1.25'),
        poReference: 'PO-001',
        totalPoAmount: new Prisma.Decimal('12000.50'),
        advancePaymentType: AdvanceToSupplierPaymentType.PERCENTAGE,
        advancePaymentPercentage: new Prisma.Decimal('50'),
        amount: new Prisma.Decimal('6000.25'),
        remarks: null,
        status: AdvanceToSupplierStatus.DRAFT,
        createdByUserId: null,
        createdAt: new Date('2026-06-11T08:30:00.000Z'),
        updatedByUserId: 7,
        updatedAt: new Date('2026-06-12T08:30:00.000Z'),
      } as unknown as AdvanceToSupplierWithPayload,
      new Map([[7, 'Maria Santos']]),
    );

    expect(mapped).toEqual(
      expect.objectContaining({
        id: '10',
        documentDate: '2026-06-11',
        partyId: '20',
        partyCode: 'SUP-001',
        partyName: 'Office Supplier',
        accountCode: '1100',
        accountTitle: 'Advances to Suppliers',
        exchangeRate: 1.25,
        totalPoAmount: 12000.5,
        advancePaymentPercentage: 50,
        amount: 6000.25,
        createdBy: SystemGeneratedAuditLabel,
        updatedBy: 'Maria Santos',
      }),
    );
  });
});
