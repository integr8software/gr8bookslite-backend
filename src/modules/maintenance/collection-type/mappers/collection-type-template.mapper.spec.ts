import { AccountNature, ChartAccountStatus, ChartAccountType, DefaultAccountTemplateType } from '@prisma/client';
import { SystemGeneratedAuditLabel } from '../../../../common/utils/audit-user.util';
import { mapCollectionType } from './collection-type-template.mapper';

describe('mapCollectionType', () => {
  it('maps collection templates with generated revenue account metadata', () => {
    const result = mapCollectionType(
      {
        id: 1n,
        companyId: 11,
        type: DefaultAccountTemplateType.COLLECTION,
        name: 'Tuition',
        description: null,
        status: ChartAccountStatus.ACTIVE,
        expenseCoa: null,
        revenueCoa: {
          id: 20n,
          accountCode: '4100-001',
          accountTitle: 'Tuition Revenue',
          accountType: ChartAccountType.REVENUE,
          accountNature: AccountNature.CREDIT,
          parentAccountId: 4n,
          status: ChartAccountStatus.ACTIVE,
        },
        createdByUserId: null,
        updatedByUserId: 7,
        createdAt: new Date('2026-09-01T00:00:00.000Z'),
        updatedAt: null,
      } as never,
      new Map([[7, 'Bay']]),
    );

    expect(result).toEqual(
      expect.objectContaining({
        id: '1',
        defaultAccountName: 'Tuition',
        description: '',
        createdBy: SystemGeneratedAuditLabel,
        updatedBy: 'Bay',
        generatedAccounts: [
          {
            role: 'REVENUE',
            chartAccountId: '20',
            accountCode: '4100-001',
            accountTitle: 'Tuition Revenue',
            accountType: ChartAccountType.REVENUE,
            accountNature: AccountNature.CREDIT,
            parentAccountId: '4',
            status: ChartAccountStatus.ACTIVE,
          },
        ],
      }),
    );
  });
});
