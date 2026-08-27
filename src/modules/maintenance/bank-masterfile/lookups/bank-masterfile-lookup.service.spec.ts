import { ChartAccountStatus } from '@prisma/client';
import { BankMasterfileLookupService } from './bank-masterfile-lookup.service';

describe('BankMasterfileLookupService', () => {
  it('normalizes lookup filters and masks account numbers', async () => {
    const prisma = { bankAccount: { findMany: jest.fn() } };
    const service = new BankMasterfileLookupService(prisma as never);
    prisma.bankAccount.findMany.mockResolvedValue([
      { id: 10n, bankName: 'Demo Bank', accountName: 'Operating', accountNumber: ' 1234567890 ', currencyCode: 'PHP', status: ChartAccountStatus.ACTIVE },
    ]);

    const result = await service.findOptions({ companyId: 11, search: ' demo ', currencyCode: ' php ' });

    expect(prisma.bankAccount.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          companyId: 11,
          status: ChartAccountStatus.ACTIVE,
          currencyCode: { equals: 'PHP', mode: 'insensitive' },
          OR: expect.arrayContaining([{ bankName: { contains: 'demo', mode: 'insensitive' } }]),
        }),
      }),
    );
    expect(result).toEqual([expect.objectContaining({ id: '10', maskedAccountNumber: '******7890', currencyCode: 'PHP' })]);
  });

  it('fully masks account numbers with four or fewer characters', async () => {
    const prisma = {
      bankAccount: {
        findMany: jest
          .fn()
          .mockResolvedValue([
            { id: 1n, bankName: 'Bank', accountName: 'Short', accountNumber: '123', currencyCode: 'PHP', status: ChartAccountStatus.ACTIVE },
          ]),
      },
    };
    const service = new BankMasterfileLookupService(prisma as never);

    await expect(service.findOptions({ companyId: 11 })).resolves.toEqual([expect.objectContaining({ maskedAccountNumber: '***' })]);
  });
});
