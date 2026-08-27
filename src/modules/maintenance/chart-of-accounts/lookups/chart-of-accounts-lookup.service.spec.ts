import { ChartAccountLevel, ChartAccountStatus } from '@prisma/client';
import { ChartOfAccountsLookupService } from './chart-of-accounts-lookup.service';

describe('ChartOfAccountsLookupService', () => {
  it('parses filters, trims search, and maps ids', async () => {
    const prisma = { chartAccount: { findMany: jest.fn() } };
    const service = new ChartOfAccountsLookupService(prisma as never);
    prisma.chartAccount.findMany.mockResolvedValue([
      { id: 12n, accountCode: '1000', accountTitle: 'Cash', accountType: 'ASSET', accountNature: 'DEBIT', status: ChartAccountStatus.ACTIVE },
    ]);

    const result = await service.findOptions({
      companyId: 11,
      query: { parentAccountId: '2', postingOnly: true, accountLevel: ChartAccountLevel.SPECIFIC, search: ' cash ' },
    });

    expect(prisma.chartAccount.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          companyId: 11,
          parentAccountId: 2n,
          isPostingAccount: true,
          accountLevel: ChartAccountLevel.SPECIFIC,
          OR: [{ accountCode: { contains: 'cash', mode: 'insensitive' } }, { accountTitle: { contains: 'cash', mode: 'insensitive' } }],
        }),
      }),
    );
    expect(result[0]).toEqual(expect.objectContaining({ id: '12', accountCode: '1000', accountTitle: 'Cash' }));
  });

  it('forces posting-only and all-account variants', async () => {
    const prisma = { chartAccount: { findMany: jest.fn().mockResolvedValue([]) } };
    const service = new ChartOfAccountsLookupService(prisma as never);

    await service.findPostingOptions({ companyId: 11, query: {} });
    expect(prisma.chartAccount.findMany).toHaveBeenLastCalledWith(expect.objectContaining({ where: expect.objectContaining({ isPostingAccount: true }) }));
    await service.findAllOptions({ companyId: 11, query: { postingOnly: true } });
    expect(prisma.chartAccount.findMany).toHaveBeenLastCalledWith(expect.objectContaining({ where: expect.not.objectContaining({ isPostingAccount: true }) }));
  });
});
