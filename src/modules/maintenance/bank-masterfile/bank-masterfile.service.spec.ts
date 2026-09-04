/* eslint-disable @typescript-eslint/no-unsafe-assignment -- Jest asymmetric matchers are typed as any. */
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

describe('BankMasterfileService create', () => {
  it('returns custom message with Account Code - Account Title when saved code differs from indicated', async () => {
    const cashInBankParent = { id: 100n, accountCode: '1010000000', accountTitle: 'Cash in Bank' };
    const tx = {
      chartAccount: {
        create: jest.fn().mockResolvedValue({ id: 101n, accountCode: '1010000002', accountTitle: 'Cash in Bank - BDO - Makati - 123456' }),
        update: jest.fn().mockResolvedValue({}),
      },
      bankAccount: {
        updateMany: jest.fn().mockResolvedValue({}),
        create: jest.fn().mockResolvedValue({
          id: 50n,
          companyId: 11,
          coaId: 101n,
          bankName: 'BDO',
          accountName: 'Cash in Bank - BDO - Makati - 123456',
          accountNumber: '123456',
          status: ChartAccountStatus.ACTIVE,
          createdByUserId: 1,
          updatedByUserId: null,
          createdAt: new Date(),
          updatedAt: null,
          coa: {
            id: 101n,
            accountCode: '1010000002',
            accountTitle: 'Cash in Bank - BDO - Makati - 123456',
            accountGroup: [],
            status: ChartAccountStatus.ACTIVE,
          },
        }),
        update: jest.fn().mockResolvedValue({
          id: 50n,
          companyId: 11,
          coaId: 101n,
          bankName: 'BDO',
          accountName: 'Cash in Bank - BDO - Makati - 123456',
          accountNumber: '123456',
          status: ChartAccountStatus.ACTIVE,
          createdByUserId: 1,
          updatedByUserId: null,
          createdAt: new Date(),
          updatedAt: null,
          coa: {
            id: 101n,
            accountCode: '1010000002',
            accountTitle: 'Cash in Bank - BDO - Makati - 123456',
            accountGroup: [],
            status: ChartAccountStatus.ACTIVE,
          },
        }),
      },
    };

    const prisma = {
      user: { findMany: jest.fn().mockResolvedValue([]) },
      companyUser: { findFirst: jest.fn().mockResolvedValue({ role: AppRole.SUPER_ADMIN, status: 'ACTIVE' }) },
      $transaction: jest.fn((callback: (client: unknown) => unknown) => callback(tx)),
    };

    const support = {
      findCashInBankParentOrThrow: jest.fn().mockResolvedValue(cashInBankParent),
      isAccountCodeTaken: jest.fn().mockResolvedValue(true),
      generateNextCashInBankAccountCode: jest.fn().mockResolvedValue('1010000002'),
      ensureBankAccountAvailable: jest.fn().mockResolvedValue(undefined),
    };

    const chartAccountBankSyncService = {
      validateLinkedPairOrThrow: jest.fn().mockResolvedValue(undefined),
    };

    const service = new BankMasterfileService(prisma as never, chartAccountBankSyncService as never, support as never);

    const result = await service.create(
      { companyId: 11, id: 1, role: AppRole.SUPER_ADMIN } as never,
      {
        bankName: 'BDO',
        branch: 'Makati',
        accountNumber: '123456',
        accountCode: '1010000001',
        accountType: 'CHECKING' as never,
        seriesStart: '1',
        seriesEnd: '100',
        seriesDigits: 6,
      } as never,
    );

    expect(support.isAccountCodeTaken).toHaveBeenCalledWith(11, '1010000001', tx);
    expect(support.generateNextCashInBankAccountCode).toHaveBeenCalledWith(11, 100n, '1010000000', tx);
    expect(result.message).toBe(
      'Bank account created successfully. Saved with Account Code - Account Title: 1010000002 - Cash in Bank - BDO - Makati - 123456.',
    );
  });
});
