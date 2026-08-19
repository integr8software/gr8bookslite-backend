/* eslint-disable @typescript-eslint/no-unsafe-assignment -- Jest asymmetric matchers are typed as any. */
import { AccountNature, ChartAccountStatus, ChartAccountType, DefaultAccountTemplateType } from '@prisma/client';
import { DefaultAccountLookupService } from './default-account-lookup.service';

describe('DefaultAccountLookupService', () => {
  it('filters default accounts and maps the chart account matching the template type', async () => {
    const prisma = { defaultAccount: { findMany: jest.fn() } };
    const service = new DefaultAccountLookupService(prisma as never);
    prisma.defaultAccount.findMany.mockResolvedValue([
      {
        id: 7n,
        type: DefaultAccountTemplateType.EXPENSE,
        name: 'Freight',
        description: null,
        status: ChartAccountStatus.ACTIVE,
        expenseCoa: {
          id: 20n,
          accountCode: '5100',
          accountTitle: 'Freight Expense',
          accountType: ChartAccountType.EXPENSE,
          accountNature: AccountNature.DEBIT,
        },
        revenueCoa: null,
      },
    ]);

    const result = await service.findDefaultAccountOptions({
      companyId: 11,
      query: { search: ' freight ' },
      type: DefaultAccountTemplateType.EXPENSE,
    });

    expect(prisma.defaultAccount.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          companyId: 11,
          deletedAt: null,
          type: DefaultAccountTemplateType.EXPENSE,
          status: ChartAccountStatus.ACTIVE,
          OR: expect.arrayContaining([{ name: { contains: 'freight', mode: 'insensitive' } }]),
        }),
      }),
    );
    expect(result).toEqual([
      expect.objectContaining({
        id: '7',
        defaultAccountName: 'Freight',
        description: '',
        chartAccountId: '20',
        accountCode: '5100',
      }),
    ]);
  });
});
