import { ConflictException } from '@nestjs/common';
import { ChartOfAccountsService } from './chart-of-accounts.service';

describe('ChartOfAccountsService account title ownership', () => {
  function createService() {
    const prisma = {
      chartAccount: {
        findFirst: jest.fn(),
      },
    };

    return {
      prisma,
      service: new ChartOfAccountsService(prisma as never, {} as never),
    };
  }

  it('checks a normalized account title under the selected company parent', async () => {
    const { prisma, service } = createService();
    prisma.chartAccount.findFirst.mockResolvedValue(null);

    await expect(
      callPrivate(service, 'assertUniqueAccountTitleUnderParent', {
        companyId: 11,
        parentAccountId: 100n,
        accountTitle: '  Office Supplies  ',
        excludeAccountId: 205n,
      }),
    ).resolves.toBeUndefined();

    expect(prisma.chartAccount.findFirst).toHaveBeenCalledWith({
      where: {
        companyId: 11,
        parentAccountId: 100n,
        accountTitle: { equals: 'Office Supplies', mode: 'insensitive' },
        id: { not: 205n },
      },
      select: { id: true },
    });
  });

  it('rejects a duplicate account title under the same parent', async () => {
    const { prisma, service } = createService();
    prisma.chartAccount.findFirst.mockResolvedValue({ id: 206n });

    await expect(
      callPrivate(service, 'assertUniqueAccountTitleUnderParent', {
        companyId: 11,
        parentAccountId: 100n,
        accountTitle: 'Office Supplies',
      }),
    ).rejects.toThrow(ConflictException);
  });
});

function callPrivate(service: ChartOfAccountsService, methodName: string, ...args: unknown[]) {
  return (service as never as Record<string, (...values: unknown[]) => Promise<unknown>>)[methodName](...args);
}
