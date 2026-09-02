import { CashAdvanceStatus, Prisma } from '@prisma/client';
import { SystemGeneratedAuditLabel } from '../../../../common/utils/audit-user.util';
import type { CashAdvanceWithPayload } from '../prisma/cash-advance.include';
import { mapCashAdvance } from './cash-advance.mapper';

describe('mapCashAdvance', () => {
  it('maps relation fallbacks, aliases, decimals, and audit labels', () => {
    const mapped = mapCashAdvance(
      {
        id: 11n,
        transNo: 'CA-2026-000001',
        documentDate: new Date('2026-06-11T00:00:00.000Z'),
        dueDate: new Date('2026-06-20T00:00:00.000Z'),
        referenceNo: 'REF-1',
        partyId: 21n,
        partyCodeSnapshot: '',
        partyNameSnapshot: '',
        party: { partyCodeNo: 'EMP-001', partyName: 'Juan Dela Cruz' },
        creditAccount: { accountCode: '1300', accountTitle: 'Employee Advances' },
        accountCodeSnapshot: '',
        accountTitleSnapshot: '',
        costCenterSnapshot: 'Sales',
        costCenterCodeSnapshot: 'SAL',
        projectNameSnapshot: 'Expansion',
        projectCodeSnapshot: 'EXP',
        currencyCode: 'PHP',
        exchangeRate: new Prisma.Decimal('1.5'),
        amount: new Prisma.Decimal('2500.75'),
        remarks: null,
        status: CashAdvanceStatus.DRAFT,
        createdByUserId: null,
        createdAt: new Date('2026-06-11T08:30:00.000Z'),
        updatedByUserId: 8,
        updatedAt: new Date('2026-06-12T08:30:00.000Z'),
      } as unknown as CashAdvanceWithPayload,
      new Map([[8, 'Ana Reyes']]),
    );

    expect(mapped).toEqual(
      expect.objectContaining({
        id: '11',
        transNo: 'CA-2026-000001',
        documentDate: '2026-06-11',
        dueDate: '2026-06-20',
        partyId: '21',
        partyCode: 'EMP-001',
        partyName: 'Juan Dela Cruz',
        accountCode: '1300',
        accountTitle: 'Employee Advances',
        projectRef: 'Expansion',
        fxRate: 1.5,
        amount: 2500.75,
        createdBy: SystemGeneratedAuditLabel,
        updatedBy: 'Ana Reyes',
      }),
    );
  });
});
