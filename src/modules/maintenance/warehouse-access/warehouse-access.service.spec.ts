import { AccessScopeLevel, MembershipStatus, UserStatus } from '@prisma/client';
import { AppRole } from '../../../common/enums/app-role.enum';
import { WarehouseAccessService } from './warehouse-access.service';

describe('WarehouseAccessService company directory', () => {
  function createService() {
    const prisma = {
      membership: {
        findMany: jest.fn(),
      },
      companyUnit: {
        findMany: jest.fn(),
      },
    };

    return { prisma, service: new WarehouseAccessService(prisma as never) };
  }

  it('maps company-wide members to every active branch', async () => {
    const { prisma, service } = createService();
    prisma.companyUnit.findMany.mockResolvedValue([
      { id: 101, name: 'Makati Branch' },
      { id: 102, name: 'Cebu Branch' },
    ]);
    prisma.membership.findMany.mockResolvedValue([
      {
        accessScope: AccessScopeLevel.COMPANY,
        companyRoleId: 8,
        companyRole: { id: 8, name: 'Inventory Manager' },
        unitAccess: [],
        user: {
          id: 27,
          name: 'Ana Santos',
          email: 'ana.santos@example.com',
          contactNumber: '09171234567',
          status: UserStatus.ACTIVE,
        },
      },
    ]);

    const result = await service.findDirectoryUsers({ companyId: 11, role: AppRole.SUPER_ADMIN } as never, { search: ' ana ' });

    expect(prisma.membership.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ companyId: 11, status: MembershipStatus.ACTIVE }),
      }),
    );
    expect(result.users).toEqual([
      {
        id: 27,
        name: 'Ana Santos',
        email: 'ana.santos@example.com',
        contactNumber: '09171234567',
        status: UserStatus.ACTIVE,
        branchUnitIds: [101, 102],
        branchNames: ['Makati Branch', 'Cebu Branch'],
        companyRoleId: 8,
        companyRoleName: 'Inventory Manager',
      },
    ]);
  });
});
