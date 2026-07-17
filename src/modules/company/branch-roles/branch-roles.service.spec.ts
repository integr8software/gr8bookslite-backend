import { BadRequestException } from '@nestjs/common';
import { validate } from 'class-validator';
import { AppRole } from '../../../common/enums/app-role.enum';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { BranchRolePermissionDto } from './dto/branch-role-permission.dto';
import { BranchRolesService } from './branch-roles.service';
import { mapBranchRole } from './mappers/branch-role.mapper';

const superAdmin = {
  id: 1,
  role: AppRole.SUPER_ADMIN,
} as AuthUser;

describe('BranchRolesService permission architecture', () => {
  function createService(prismaOverrides: Record<string, unknown> = {}) {
    const prisma = {
      companyUnit: {
        findUnique: jest.fn().mockResolvedValue({
          id: 10,
          companyId: 20,
          isActive: true,
        }),
      },
      module: {
        findMany: jest.fn(),
      },
      permission: {
        findUnique: jest.fn(),
      },
      ...prismaOverrides,
    };
    const entitlementService = {
      getCompanyAllowedModules: jest.fn().mockResolvedValue([]),
      getCompanyPlanSidebarItems: jest.fn().mockResolvedValue([]),
    };

    return {
      entitlementService,
      prisma,
      service: new BranchRolesService(prisma as never, entitlementService as never),
    };
  }

  it('returns every active module under the current sidebar section structure', async () => {
    const { entitlementService, service } = createService();
    entitlementService.getCompanyAllowedModules.mockResolvedValue([
      {
        id: 1,
        code: 'PCFR',
        name: 'Petty Cash Fund Replenishment',
        permissions: [{ code: 'PCFR' }],
      },
    ]);
    entitlementService.getCompanyPlanSidebarItems.mockResolvedValue([]);

    await expect(service.getPermissionCatalog(superAdmin, 10)).resolves.toEqual({
      modules: [
        {
          code: 'other-modules',
          name: 'Other Modules',
          submodules: [
            {
              code: 'PCFR',
              name: 'Petty Cash Fund Replenishment',
              permissionCode: 'PCFR',
              actions: ['view', 'create', 'update', 'cancel', 'uncancel', 'export'],
            },
          ],
        },
      ],
    });

    expect(entitlementService.getCompanyAllowedModules).toHaveBeenCalledWith(20);
  });

  it('lists only roles scoped to the requested branch unit', async () => {
    const { prisma, service } = createService({
      companyRole: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    });
    const companyRole = prisma as typeof prisma & {
      companyRole: { findMany: jest.Mock };
    };

    await service.findAll(superAdmin, 10);

    expect(companyRole.companyRole.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          companyId: 20,
          unitId: 10,
        }),
      }),
    );
  });

  it('keeps a root sidebar module in its own top-level group', async () => {
    const { entitlementService, service } = createService();
    entitlementService.getCompanyAllowedModules.mockResolvedValue([
      {
        id: 1,
        code: 'DO',
        name: 'Dashboard',
        permissions: [{ code: 'DO' }],
      },
    ]);
    entitlementService.getCompanyPlanSidebarItems.mockResolvedValue([
      {
        id: 10,
        parentId: null,
        moduleId: 1,
        systemCode: 'SYSTEM',
        key: 'dashboard',
        label: 'Dashboard',
        description: null,
        iconName: null,
        sortOrder: 0,
        itemType: 'LINK',
      },
    ]);

    await expect(service.getPermissionCatalog(superAdmin, 10)).resolves.toEqual({
      modules: [
        {
          code: 'system-dashboard',
          name: 'Dashboard',
          submodules: [
            {
              code: 'DO',
              name: 'Dashboard',
              permissionCode: 'DO',
              actions: ['view', 'create', 'update', 'cancel', 'uncancel', 'export'],
            },
          ],
        },
      ],
    });
  });

  it('accepts the preferred payload without frontend catalog names', async () => {
    const { prisma, service } = createService();
    prisma.permission.findUnique.mockResolvedValue({
      id: 100,
      code: 'PCFR',
      name: 'Petty Cash Fund Replenishment',
      isActive: true,
      module: null,
      submodule: {
        isActive: true,
        module: {
          code: 'cash-disbursement',
          name: 'Cash Disbursement',
          isActive: true,
        },
      },
    });

    const resolved = await (
      service as unknown as {
        resolveRolePermissions: (permissions: unknown[]) => Promise<Record<string, unknown>[]>;
      }
    ).resolveRolePermissions([
      {
        permissionCode: 'PCFR',
        actions: ['create', 'cancel', 'uncancel'],
      },
    ]);

    expect(resolved).toEqual([
      expect.objectContaining({
        permissionId: 100,
        permissionCode: 'PCFR',
        permissionName: 'Petty Cash Fund Replenishment',
        moduleCode: 'cash-disbursement',
        moduleName: 'Cash Disbursement',
        canView: true,
        canCreate: true,
        canCancel: true,
        canUncancel: true,
      }),
    ]);
  });

  it('maps legacy replenishment codes to PCFR cancel access', async () => {
    const { prisma, service } = createService();
    prisma.permission.findUnique.mockResolvedValue({
      id: 100,
      code: 'PCFR',
      name: 'Petty Cash Fund Replenishment',
      isActive: true,
      module: null,
      submodule: {
        isActive: true,
        module: {
          code: 'cash-disbursement',
          name: 'Cash Disbursement',
          isActive: true,
        },
      },
    });

    const resolved = await (
      service as unknown as {
        resolveRolePermissions: (permissions: unknown[]) => Promise<Record<string, unknown>[]>;
      }
    ).resolveRolePermissions([
      {
        moduleCode: 'cash-disbursement',
        moduleName: 'Cash Disbursement',
        permissionCode: 'cash-disbursement-petty-cash-fund-replenishment',
        permissionName: 'Petty Cash Fund Replenishment',
        actions: ['cancel'],
      },
    ]);

    expect(prisma.permission.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          code: 'PCFR',
        },
      }),
    );
    expect(resolved[0]).toEqual(
      expect.objectContaining({
        canView: true,
        canCancel: true,
      }),
    );
  });

  it.each([
    {
      legacyCode: 'cash-disbursement-petty-cash-advance',
      canonicalCode: 'PCA',
      permissionName: 'Petty Cash Advance',
      moduleCode: 'cash-disbursement',
      moduleName: 'Cash Disbursement',
    },
    {
      legacyCode: 'accounts-payable-accounts-payable-voucher',
      canonicalCode: 'APV',
      permissionName: 'Accounts Payable Voucher',
      moduleCode: 'accounts-payable',
      moduleName: 'Accounts Payable',
    },
  ])('maps legacy $legacyCode payloads to $canonicalCode', async ({ legacyCode, canonicalCode, permissionName, moduleCode, moduleName }) => {
    const { prisma, service } = createService();
    prisma.permission.findUnique.mockResolvedValue({
      id: 100,
      code: canonicalCode,
      name: permissionName,
      isActive: true,
      module: null,
      submodule: {
        isActive: true,
        module: {
          code: moduleCode,
          name: moduleName,
          isActive: true,
        },
      },
    });

    const resolved = await (
      service as unknown as {
        resolveRolePermissions: (permissions: unknown[]) => Promise<Record<string, unknown>[]>;
      }
    ).resolveRolePermissions([
      {
        permissionCode: legacyCode,
        actions: ['create'],
      },
    ]);

    expect(prisma.permission.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          code: canonicalCode,
        },
      }),
    );
    expect(resolved[0]).toEqual(
      expect.objectContaining({
        permissionCode: canonicalCode,
        permissionName,
        moduleCode,
        moduleName,
        canView: true,
        canCreate: true,
      }),
    );
  });

  it('rejects unsupported permission codes', async () => {
    const { prisma, service } = createService();
    prisma.permission.findUnique.mockResolvedValue(null);

    await expect(
      (
        service as unknown as {
          resolveRolePermissions: (permissions: unknown[]) => Promise<unknown>;
        }
      ).resolveRolePermissions([
        {
          permissionCode: 'UNKNOWN',
          actions: ['view'],
        },
      ]),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects permissions outside the active backend catalog', async () => {
    const { prisma, service } = createService();
    prisma.permission.findUnique.mockResolvedValue({
      id: 100,
      code: 'PCFR',
      name: 'Petty Cash Fund Replenishment',
      isActive: true,
      module: null,
      submodule: {
        isActive: false,
        module: {
          code: 'cash-disbursement',
          name: 'Cash Disbursement',
          isActive: true,
        },
      },
    });

    await expect(
      (
        service as unknown as {
          resolveRolePermissions: (permissions: unknown[]) => Promise<unknown>;
        }
      ).resolveRolePermissions([
        {
          permissionCode: 'PCFR',
          actions: ['view'],
        },
      ]),
    ).rejects.toThrow(BadRequestException);
  });

  it('merges duplicate role grants using OR logic', async () => {
    const { prisma, service } = createService();
    prisma.permission.findUnique.mockResolvedValue({
      id: 100,
      code: 'PCFR',
      name: 'Petty Cash Fund Replenishment',
      isActive: true,
      module: null,
      submodule: {
        isActive: true,
        module: {
          code: 'cash-disbursement',
          name: 'Cash Disbursement',
          isActive: true,
        },
      },
    });

    const resolved = await (
      service as unknown as {
        resolveRolePermissions: (permissions: unknown[]) => Promise<Record<string, unknown>[]>;
      }
    ).resolveRolePermissions([
      {
        permissionCode: 'PCFR',
        actions: ['create'],
      },
      {
        permissionCode: 'PCFR',
        actions: ['cancel'],
      },
    ]);

    expect(resolved).toHaveLength(1);
    expect(resolved[0]).toEqual(
      expect.objectContaining({
        canView: true,
        canCreate: true,
        canCancel: true,
      }),
    );
  });

  it('validates the preferred payload and rejects deprecated actions', async () => {
    const preferred = Object.assign(new BranchRolePermissionDto(), {
      permissionCode: 'PCFR',
      actions: ['view', 'cancel', 'uncancel'],
    });
    const deprecated = Object.assign(new BranchRolePermissionDto(), {
      permissionCode: 'PCFR',
      actions: ['delete', 'approve'],
    });

    await expect(validate(preferred)).resolves.toEqual([]);
    await expect(validate(deprecated)).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          property: 'actions',
        }),
      ]),
    );
  });

  it('reopens existing roles using only active normalized actions', () => {
    const role = mapBranchRole({
      id: 5,
      code: 'CASHIER',
      name: 'Cashier',
      description: null,
      roleType: 'CUSTOM',
      scopeLevel: 'BRANCH',
      isSystem: false,
      isActive: true,
      companyId: 20,
      unitId: 10,
      createdAt: new Date(),
      updatedAt: new Date(),
      permissions: [
        {
          id: 10,
          companyRoleId: 5,
          permissionId: 100,
          canView: true,
          canCreate: true,
          canUpdate: false,
          canCancel: true,
          canUncancel: false,
          canExport: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          permission: {
            id: 100,
            code: 'PCFR',
            name: 'Petty Cash Fund Replenishment',
            description: null,
            targetType: 'SUBMODULE',
            moduleId: 40,
            submoduleId: 60,
            scopeLevel: 'BRANCH',
            requiresCompanyContext: true,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
            module: null,
            submodule: {
              id: 60,
              moduleId: 40,
              code: 'PCFR',
              name: 'Petty Cash Fund Replenishment',
              sortOrder: 60,
              isActive: true,
              createdAt: new Date(),
              updatedAt: new Date(),
              module: {
                id: 40,
                code: 'cash-disbursement',
                name: 'Cash Disbursement',
                description: null,
                sortOrder: 40,
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            },
          },
        },
      ],
    } as never);

    expect(role.permissions[0]).toEqual(
      expect.objectContaining({
        permissionCode: 'PCFR',
        moduleCode: 'cash-disbursement',
        actions: ['view', 'create', 'cancel'],
      }),
    );
  });
});
