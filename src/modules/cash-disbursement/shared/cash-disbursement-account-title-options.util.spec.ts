import { AccountNature, ChartAccountStatus, ChartAccountType } from '@prisma/client';
import { findCashDisbursementAccountTitleOptions } from './cash-disbursement-account-title-options.util';

describe('findCashDisbursementAccountTitleOptions', () => {
  it('returns active default expense accounts and party employee advance accounts', async () => {
    const prisma = {
      defaultAccount: {
        findMany: jest.fn().mockResolvedValue([
          {
            expenseCoa: {
              id: 10n,
              accountCode: '5020100001',
              accountTitle: 'Office Supplies Expense',
              accountType: ChartAccountType.EXPENSE,
              accountNature: AccountNature.DEBIT,
              status: ChartAccountStatus.ACTIVE,
            },
          },
        ]),
      },
      party: {
        findMany: jest.fn().mockResolvedValue([
          {
            employeeAdvanceAccount: {
              id: 20n,
              accountCode: '1010103004',
              accountTitle: 'Advances to Employees',
              accountType: ChartAccountType.ASSET,
              accountNature: AccountNature.DEBIT,
              status: ChartAccountStatus.ACTIVE,
            },
          },
        ]),
      },
    };

    const result = await findCashDisbursementAccountTitleOptions({
      companyId: 7,
      prisma: prisma as never,
      query: {},
    });

    expect(result).toEqual([
      {
        id: '20',
        accountCode: '1010103004',
        accountTitle: 'Advances to Employees',
        accountType: ChartAccountType.ASSET,
        accountNature: AccountNature.DEBIT,
        status: ChartAccountStatus.ACTIVE,
      },
      {
        id: '10',
        accountCode: '5020100001',
        accountTitle: 'Office Supplies Expense',
        accountType: ChartAccountType.EXPENSE,
        accountNature: AccountNature.DEBIT,
        status: ChartAccountStatus.ACTIVE,
      },
    ]);
    expect(prisma.defaultAccount.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          companyId: 7,
          type: 'EXPENSE',
          expenseCoa: { is: expect.objectContaining({ isPostingAccount: true, status: ChartAccountStatus.ACTIVE }) },
        }),
      }),
    );
    expect(prisma.party.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          companyId: 7,
          employeeAdvanceAccountId: { not: null },
          employeeAdvanceAccount: { is: expect.objectContaining({ isPostingAccount: true, status: ChartAccountStatus.ACTIVE }) },
        }),
      }),
    );
  });

  it('deduplicates accounts shared by default expenses and employee advances', async () => {
    const sharedAccount = {
      id: 30n,
      accountCode: '1010103999',
      accountTitle: 'Employee Advances - Sales',
      accountType: ChartAccountType.ASSET,
      accountNature: AccountNature.DEBIT,
      status: ChartAccountStatus.ACTIVE,
    };
    const prisma = {
      defaultAccount: { findMany: jest.fn().mockResolvedValue([{ expenseCoa: sharedAccount }]) },
      party: {
        findMany: jest.fn().mockResolvedValue([{ employeeAdvanceAccount: sharedAccount }, { employeeAdvanceAccount: sharedAccount }]),
      },
    };

    const result = await findCashDisbursementAccountTitleOptions({
      companyId: 7,
      prisma: prisma as never,
      query: {},
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: '30', accountCode: '1010103999' });
  });
});
