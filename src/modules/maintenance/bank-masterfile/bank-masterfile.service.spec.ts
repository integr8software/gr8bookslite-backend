import { ChartAccountStatus } from '@prisma/client';
import { AppRole } from '../../../common/enums/app-role.enum';
import { BankMasterfileService } from './bank-masterfile.service';

describe('BankMasterfileService bank options', () => {
  function createService() {
    const prisma = {
      bankAccount: {
        findMany: jest.fn(),
      },
    };

    return {
      prisma,
      service: new BankMasterfileService(prisma as never, {} as never, {} as never),
    };
  }

  it('returns active company banks with normalized filters and masked account numbers', async () => {
    const { prisma, service } = createService();
    prisma.bankAccount.findMany.mockResolvedValue([
      {
        id: 41n,
        bankName: 'Bank of the Philippines',
        accountName: 'Operating Account',
        accountNumber: '1234567890',
        currencyCode: 'PHP',
        status: ChartAccountStatus.ACTIVE,
      },
    ]);

    const result = await service.findOptions({ companyId: 11, role: AppRole.SUPER_ADMIN } as never, { search: ' operating ', currencyCode: ' php ' });

    expect(prisma.bankAccount.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          companyId: 11,
          status: ChartAccountStatus.ACTIVE,
          currencyCode: { equals: 'PHP', mode: 'insensitive' },
          OR: expect.arrayContaining([{ accountName: { contains: 'operating', mode: 'insensitive' } }]),
        }),
      }),
    );
    expect(result).toEqual({
      banks: [
        {
          id: '41',
          bankName: 'Bank of the Philippines',
          accountName: 'Operating Account',
          maskedAccountNumber: '******7890',
          currencyCode: 'PHP',
          status: ChartAccountStatus.ACTIVE,
        },
      ],
    });
  });
});
