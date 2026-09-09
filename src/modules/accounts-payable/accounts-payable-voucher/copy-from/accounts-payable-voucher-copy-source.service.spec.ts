import { AccountsPayableVoucherStatus } from '@prisma/client';
import { AppRole } from '../../../../common/enums/app-role.enum';
import type { AuthUser } from '../../../../common/interfaces/auth-user.interface';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AccountsPayableVoucherCopySourceService } from './accounts-payable-voucher-copy-source.service';

describe('AccountsPayableVoucherCopySourceService', () => {
  const service = new AccountsPayableVoucherCopySourceService({} as PrismaService);
  const getCopiedDetailAmounts = (
    service as unknown as {
      getCopiedDetailAmounts: (details: Array<Record<string, unknown>>) => Array<{
        reference: string;
        grossAmount: number;
        payableAmount: number;
      }>;
    }
  ).getCopiedDetailAmounts.bind(service);

  it('uses the public APV transaction reference for new copied details', () => {
    expect(
      getCopiedDetailAmounts([
        {
          refId: 'APV:APV-000001',
          grossAmount: 5000,
          disburseAmount: 4850,
        },
      ]),
    ).toEqual([{ reference: 'APV:APV-000001', grossAmount: 5000, payableAmount: 4850 }]);
  });

  it('keeps legacy numeric APV references readable', () => {
    expect(getCopiedDetailAmounts([{ refId: '1', grossAmount: 3000, disburseAmount: 2910 }])).toEqual([
      { reference: '1', grossAmount: 3000, payableAmount: 2910 },
    ]);
  });

  it('only fetches posted APVs as copy candidates', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const prisma = {
      accountsPayableVoucher: {
        count: jest.fn().mockResolvedValue(0),
        findMany,
      },
      cashVoucherDetail: { findMany: jest.fn().mockResolvedValue([]) },
      disbursementVoucherDetail: { findMany: jest.fn().mockResolvedValue([]) },
    } as unknown as PrismaService;
    const service = new AccountsPayableVoucherCopySourceService(prisma);
    const user = {
      companyId: 1,
      id: 1,
      role: AppRole.SUPER_ADMIN,
      permissions: [],
    } as unknown as AuthUser;

    await service.findCandidates(user, { target: 'cash-voucher' });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: { in: [AccountsPayableVoucherStatus.POSTED] },
        }),
      }),
    );
  });

  it('filters candidates by exact party name when party name is provided', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const prisma = {
      accountsPayableVoucher: {
        count: jest.fn().mockResolvedValue(0),
        findMany,
      },
      cashVoucherDetail: { findMany: jest.fn().mockResolvedValue([]) },
      disbursementVoucherDetail: { findMany: jest.fn().mockResolvedValue([]) },
    } as unknown as PrismaService;
    const service = new AccountsPayableVoucherCopySourceService(prisma);
    const user = {
      companyId: 1,
      id: 1,
      role: AppRole.SUPER_ADMIN,
      permissions: [],
    } as unknown as AuthUser;

    await service.findCandidates(user, { partyCode: 'PM-000001', partyName: 'Hello', target: 'cash-voucher' });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          partyNameSnapshot: { equals: 'Hello', mode: 'insensitive' },
        }),
      }),
    );
  });

  it('uses the header amount as remaining balance when APV detail totals are empty', async () => {
    const prisma = {
      accountsPayableVoucher: {
        count: jest.fn().mockResolvedValue(1),
        findMany: jest.fn().mockResolvedValue([
          {
            amount: 4850,
            apvId: 1n,
            branchUnitId: 1,
            creditAccount: { accountCode: '2010', accountTitle: 'Accounts Payable' },
            creditAccountId: 10n,
            currencyCode: 'PHP',
            details: [],
            documentDate: new Date('2026-09-08T00:00:00.000Z'),
            exchangeRate: 1,
            partyCodeSnapshot: 'PM-000001',
            partyId: 1n,
            partyNameSnapshot: 'Hello',
            projectCode: null,
            projectName: null,
            referenceNo: null,
            remarks: null,
            transactionNo: 'APV-000001',
          },
        ]),
      },
      cashVoucherDetail: { findMany: jest.fn().mockResolvedValue([]) },
      disbursementVoucherDetail: { findMany: jest.fn().mockResolvedValue([]) },
    } as unknown as PrismaService;
    const service = new AccountsPayableVoucherCopySourceService(prisma);
    const user = {
      companyId: 1,
      id: 1,
      role: AppRole.SUPER_ADMIN,
      permissions: [],
    } as unknown as AuthUser;

    const result = await service.findCandidates(user, { target: 'cash-voucher' });

    expect(result.records).toHaveLength(1);
    expect(result.records[0]).toEqual(expect.objectContaining({ availableAmount: 4850, availableGrossAmount: 4850 }));
  });
});
