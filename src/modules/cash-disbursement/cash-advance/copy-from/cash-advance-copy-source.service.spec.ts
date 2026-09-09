import { CashAdvanceStatus } from '@prisma/client';
import { AppRole } from '../../../../common/enums/app-role.enum';
import type { AuthUser } from '../../../../common/interfaces/auth-user.interface';
import { PrismaService } from '../../../../prisma/prisma.service';
import { CashAdvanceCopySourceService } from './cash-advance-copy-source.service';

const authUser: AuthUser = {
  id: 1,
  companyId: 1,
  role: AppRole.SUPER_ADMIN,
  systemRole: null as never,
  membershipRole: null,
  membershipStatus: null,
  companyRoleId: null,
  companyRoleCode: null,
  companyRoleName: null,
  accessScope: null,
  enabledModules: [],
  permissions: [],
  userModules: { byBranch: [], items: [] },
};

function createPrismaMock() {
  return {
    cashAdvance: {
      count: jest.fn().mockResolvedValue(1),
      findMany: jest.fn().mockResolvedValue([
        {
          amount: '500000.00',
          branchUnitId: 2,
          costCenterCodeSnapshot: null,
          costCenterSnapshot: null,
          creditAccount: { accountCode: '1130', accountTitle: 'Advances to Employees' },
          currencyCode: 'PHP',
          documentDate: new Date('2026-09-09T00:00:00.000Z'),
          exchangeRate: '1.000000',
          id: 10n,
          partyCodeSnapshot: 'PM-000003',
          partyId: 100n,
          partyNameSnapshot: 'Jeshua Mark Sarmiento Bay',
          projectCodeSnapshot: null,
          projectNameSnapshot: null,
          referenceNo: null,
          remarks: null,
          status: CashAdvanceStatus.POSTED,
          transNo: 'CA-000001',
        },
      ]),
    },
    cashVoucherDetail: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    disbursementVoucherDetail: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  };
}

describe('CashAdvanceCopySourceService', () => {
  it('does not restrict candidates by party when Party Name is empty', async () => {
    const prisma = createPrismaMock();
    const service = new CashAdvanceCopySourceService(prisma as unknown as PrismaService);

    await service.findCandidates(authUser, {
      branchUnitId: 2,
      target: 'cash-voucher',
    });

    expect(prisma.cashAdvance.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.not.objectContaining({
          partyCodeSnapshot: expect.anything(),
          partyNameSnapshot: expect.anything(),
          partyId: expect.anything(),
        }),
      }),
    );
  });

  it('prefers Party Code over Party Name when both are provided', async () => {
    const prisma = createPrismaMock();
    const service = new CashAdvanceCopySourceService(prisma as unknown as PrismaService);

    await service.findCandidates(authUser, {
      branchUnitId: 2,
      partyCode: 'PM-000003',
      partyName: 'Display Name That May Differ',
      target: 'disbursement-voucher',
    });

    expect(prisma.cashAdvance.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          partyCodeSnapshot: { equals: 'PM-000003', mode: 'insensitive' },
        }),
      }),
    );
    expect(prisma.cashAdvance.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.not.objectContaining({
          partyNameSnapshot: expect.anything(),
        }),
      }),
    );
  });
});
