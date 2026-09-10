import { AccountNature, ChartAccountStatus, ChartAccountType, DefaultAccountTemplateType } from '@prisma/client';
import { SystemGeneratedAuditLabel } from '../../../../common/utils/audit-user.util';
import { mapDisbursementType } from './disbursement-type-template.mapper';

describe('mapDisbursementType', () => {
  it('maps expense templates with parent account and generated account metadata', () => {
    const result = mapDisbursementType({
      id: 2n,
      companyId: 11,
      type: DefaultAccountTemplateType.EXPENSE,
      name: 'Office Supplies',
      description: 'Consumables',
      status: ChartAccountStatus.ACTIVE,
      expenseCoaId: 30n,
      revenueCoaId: null,
      expenseCoa: {
        id: 30n,
        accountCode: '5100-001',
        accountTitle: 'Office Supplies Expense',
        accountType: ChartAccountType.EXPENSE,
        accountNature: AccountNature.DEBIT,
        parentAccountId: 5n,
        status: ChartAccountStatus.ACTIVE,
      },
      revenueCoa: null,
      createdByUserId: null,
      updatedByUserId: null,
      createdAt: new Date('2026-09-01T00:00:00.000Z'),
      updatedAt: null,
    } as never);

    expect(result).toEqual(
      expect.objectContaining({
        id: '2',
        defaultAccountName: 'Office Supplies',
        expenseParentCoaId: '5',
        createdBy: SystemGeneratedAuditLabel,
        generatedAccounts: [
          expect.objectContaining({
            role: 'EXPENSE',
            chartAccountId: '30',
            accountCode: '5100-001',
            accountTitle: 'Office Supplies Expense',
          }),
        ],
      }),
    );
  });
});
