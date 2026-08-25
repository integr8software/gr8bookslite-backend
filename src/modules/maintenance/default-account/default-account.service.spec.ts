/* eslint-disable @typescript-eslint/no-unsafe-assignment -- Jest asymmetric matchers are typed as any. */
import { AccountNature, ChartAccountStatus, ChartAccountType, DefaultAccountTemplateType } from '@prisma/client';
import { AppRole } from '../../../common/enums/app-role.enum';
import { DefaultAccountService } from './default-account.service';

describe('DefaultAccountService default account options', () => {
  function createService() {
    const prisma = {
      defaultAccount: {
        findMany: jest.fn(),
      },
    };

    return { prisma, service: new DefaultAccountService(prisma as never) };
  }

  it('returns expense templates with their backend-owned chart account details', async () => {
    const { prisma, service } = createService();
    prisma.defaultAccount.findMany.mockResolvedValue([
      {
        id: 9n,
        type: DefaultAccountTemplateType.EXPENSE,
        name: 'Office Supplies',
        description: 'Default office expense',
        status: ChartAccountStatus.ACTIVE,
        expenseCoa: {
          id: 101n,
          accountCode: '5100-001',
          accountTitle: 'Office Supplies Expense',
          accountType: ChartAccountType.EXPENSE,
          accountNature: AccountNature.DEBIT,
        },
        revenueCoa: null,
      },
    ]);

    const result = await service.findExpenseOptions({ companyId: 11, role: AppRole.SUPER_ADMIN } as never, { search: ' office ' });

    expect(prisma.defaultAccount.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          companyId: 11,
          deletedAt: null,
          type: DefaultAccountTemplateType.EXPENSE,
          status: ChartAccountStatus.ACTIVE,
        }),
      }),
    );
    expect(result.options).toEqual([
      {
        id: '9',
        type: DefaultAccountTemplateType.EXPENSE,
        defaultAccountName: 'Office Supplies',
        description: 'Default office expense',
        status: ChartAccountStatus.ACTIVE,
        chartAccountId: '101',
        accountCode: '5100-001',
        accountTitle: 'Office Supplies Expense',
        accountType: ChartAccountType.EXPENSE,
        accountNature: AccountNature.DEBIT,
      },
    ]);
  });
});
