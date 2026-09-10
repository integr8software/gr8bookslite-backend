import { AccountNature, ChartAccountStatus, ChartAccountType, DefaultAccountTemplateType } from '@prisma/client';
import { AppRole } from '../../../../common/enums/app-role.enum';
import { AccountsPayableVoucherLookupService } from './accounts-payable-voucher-lookup.service';

describe('AccountsPayableVoucherLookupService', () => {
  it('returns expense type options with generated chart account details', async () => {
    const prisma = {
      defaultAccount: {
        findMany: jest.fn().mockResolvedValue([
          {
            name: 'Office Supplies',
            description: 'Default office expense',
            expenseCoa: {
              id: 101n,
              accountCode: '5100-001',
              accountTitle: 'Office Supplies Expense',
              accountType: ChartAccountType.EXPENSE,
              accountNature: AccountNature.DEBIT,
            },
          },
          {
            name: 'Incomplete',
            description: null,
            expenseCoa: null,
          },
        ]),
      },
    };
    const service = new AccountsPayableVoucherLookupService(prisma as never);

    const result = await service.findExpenseTypes({ companyId: 11, id: 1, role: AppRole.SUPER_ADMIN, permissions: [] } as never);

    expect(prisma.defaultAccount.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          companyId: 11,
          deletedAt: null,
          type: DefaultAccountTemplateType.EXPENSE,
          status: ChartAccountStatus.ACTIVE,
        },
      }),
    );
    expect(result.accounts).toEqual([
      expect.objectContaining({
        id: '101',
        accountNumber: '5100-001',
        accountName: 'Office Supplies',
        accountType: 'Expenses',
        normalBalance: 'Debit',
        description: 'Default office expense',
        status: 'Active',
      }),
    ]);
  });
});
