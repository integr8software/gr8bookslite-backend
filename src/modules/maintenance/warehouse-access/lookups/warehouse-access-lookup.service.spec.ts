import { AccessScopeLevel, UserStatus } from '@prisma/client';
import { WarehouseAccessLookupService } from './warehouse-access-lookup.service';

describe('WarehouseAccessLookupService', () => {
  it('maps company-wide and branch-scoped directory users', async () => {
    const prisma = {
      membership: { findMany: jest.fn() },
      companyUnit: { findMany: jest.fn() },
    };
    const service = new WarehouseAccessLookupService(prisma as never);
    prisma.companyUnit.findMany.mockResolvedValue([
      { id: 2, name: 'North' },
      { id: 3, name: 'South' },
    ]);
    prisma.membership.findMany.mockResolvedValue([
      {
        accessScope: AccessScopeLevel.COMPANY,
        unitAccess: [],
        companyRoleId: 8,
        companyRole: { name: 'Manager' },
        user: { id: 5, name: 'Ada', email: 'ada@example.com', contactNumber: null, status: UserStatus.ACTIVE },
      },
      {
        accessScope: AccessScopeLevel.BRANCH,
        unitAccess: [{ unitId: 3, unit: { id: 3, name: 'South' } }],
        companyRoleId: null,
        companyRole: null,
        user: { id: 6, name: 'Grace', email: 'grace@example.com', contactNumber: null, status: UserStatus.ACTIVE },
      },
    ]);

    const result = await service.findDirectoryUsers({ companyId: 11, query: { branchUnitId: 3, search: ' a ' } });

    expect(prisma.membership.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          companyId: 11,
          OR: [{ accessScope: AccessScopeLevel.COMPANY }, { unitAccess: { some: { unitId: 3 } } }],
          user: expect.objectContaining({
            OR: [{ name: { contains: 'a', mode: 'insensitive' } }, { email: { contains: 'a', mode: 'insensitive' } }],
          }),
        }),
      }),
    );
    expect(result.users).toEqual([
      expect.objectContaining({ id: 5, branchUnitIds: [2, 3], branchNames: ['North', 'South'], companyRoleName: 'Manager' }),
      expect.objectContaining({ id: 6, branchUnitIds: [3], branchNames: ['South'], companyRoleName: null }),
    ]);
  });
});
