import {
  AccessScopeLevel,
  MembershipRole,
  MembershipStatus,
  SystemRole,
} from '@prisma/client';
import { AppRole } from '../enums/app-role.enum';
import { PermissionAction } from '../enums/permission-action.enum';
import { AccessControlService } from './access-control.service';
import { EntitlementService } from './entitlements/entitlement.service';
import { PermissionService } from './permissions/permission.service';
import { SidebarBuilder } from './sidebar/sidebar-builder.service';

describe('AccessControlService', () => {
  it('allows super admins through permission checks', () => {
    const service = createAccessControlService();

    expect(
      service.hasPermission(
        {
          role: AppRole.SUPER_ADMIN,
          companyId: null,
          permissions: [],
        } as never,
        'ANY',
        PermissionAction.VIEW,
      ),
    ).toBe(true);
  });

  it('checks permission keys for company-scoped users', () => {
    const service = createAccessControlService();

    expect(
      service.hasPermission(
        {
          role: AppRole.USER,
          companyId: 1,
          permissions: ['TM:view'],
        } as never,
        'TM',
        PermissionAction.VIEW,
      ),
    ).toBe(true);
    expect(
      service.hasPermission(
        {
          role: AppRole.USER,
          companyId: 1,
          permissions: ['TM:view'],
        } as never,
        'TM',
        PermissionAction.CREATE,
      ),
    ).toBe(false);
  });

  it('resolves active company access with enabled modules and user modules', async () => {
    const membership = buildMembership({
      planModules: [buildEnabledModule(5, 'TM', 'Term Management')],
      moduleSidebar: [
        {
          id: 200,
          branchUnitId: 10,
          parentId: null,
          moduleId: 5,
          itemType: 'LINK',
          key: 'custom-term-management',
          label: 'Term Management',
          description: null,
          iconName: 'calendar',
          sortOrder: 1,
          module: {
            ...buildEnabledModule(5, 'TM', 'Term Management').module,
            isActive: true,
          },
        },
      ],
    });
    const service = createAccessControlService({
      user: buildResolvedUser(),
      membership,
    });

    await expect(service.resolveAuthUser(buildPayload())).resolves.toEqual(
      expect.objectContaining({
        id: 7,
        companyId: 57,
        role: AppRole.ADMIN,
        systemRole: SystemRole.STANDARD,
        membershipRole: MembershipRole.ADMIN,
        membershipStatus: MembershipStatus.ACTIVE,
        enabledModules: ['TM'],
        userModules: expect.objectContaining({
          items: [
            expect.objectContaining({
              key: 'custom-term-management',
              moduleCode: 'TM',
            }),
          ],
          byBranch: [
            expect.objectContaining({
              branchUnitId: 10,
              items: [
                expect.objectContaining({
                  key: 'custom-term-management',
                  moduleCode: 'TM',
                }),
              ],
            }),
          ],
        }),
      }),
    );
  });

  it('resolves a fresh onboarding company with system template sidebar fallback', async () => {
    const service = createAccessControlService({
      user: buildResolvedUser(),
      membership: buildMembership({
        moduleSidebar: [],
        subscriptions: [
          {
            plan: {
              systems: [
                {
                  system: {
                    code: 'ACCOUNTING',
                    modules: [buildEnabledModule(5, 'TM', 'Term Management')],
                    sidebarItems: [
                      {
                        id: 100,
                        parentId: null,
                        moduleId: null,
                        itemType: 'SECTION',
                        key: 'financial-maintenance',
                        label: 'Financial Maintenance',
                        description: null,
                        iconName: 'accounting',
                        sortOrder: 0,
                      },
                      {
                        id: 101,
                        parentId: 100,
                        moduleId: 5,
                        itemType: 'LINK',
                        key: 'financial-maintenance-term-management',
                        label: 'Term Management',
                        description: null,
                        iconName: 'calendar',
                        sortOrder: 0,
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      }),
    });

    const authUser = await service.resolveAuthUser(buildPayload());

    expect(authUser.enabledModules).toEqual(['TM']);
    expect(authUser.userModules.items).toEqual([
      expect.objectContaining({
        key: 'accounting-financial-maintenance',
        moduleCode: null,
        children: [
          expect.objectContaining({
            key: 'accounting-financial-maintenance-term-management',
            moduleCode: 'TM',
          }),
        ],
      }),
    ]);
  });
});

function createAccessControlService({
  user = buildResolvedUser(),
  membership = null,
}: {
  user?: ReturnType<typeof buildResolvedUser>;
  membership?: ReturnType<typeof buildMembership> | null;
} = {}) {
  const entitlementService = new EntitlementService();
  const companyAccessResolver = {
    resolve: jest.fn().mockResolvedValue({ user, membership }),
  };

  return new AccessControlService(
    companyAccessResolver as never,
    entitlementService,
    new PermissionService(),
    new SidebarBuilder(entitlementService),
  );
}

function buildPayload() {
  return {
    sub: 7,
    companyId: 57,
    role: AppRole.ADMIN,
    systemRole: SystemRole.STANDARD,
    membershipRole: MembershipRole.ADMIN,
    companyRoleId: null,
  };
}

function buildResolvedUser() {
  return {
    id: 7,
    systemRole: SystemRole.STANDARD,
  };
}

function buildMembership({
  planModules = [],
  moduleSidebar = [],
  subscriptions,
}: {
  planModules?: Array<ReturnType<typeof buildEnabledModule>>;
  moduleSidebar?: unknown[];
  subscriptions?: unknown[];
}) {
  const planSubscriptions =
    subscriptions ??
    (planModules.length
      ? [
          {
            plan: {
              systems: [
                {
                  system: {
                    code: 'ACCOUNTING',
                    modules: planModules,
                    sidebarItems: [],
                  },
                },
              ],
            },
          },
        ]
      : []);

  return {
    userId: 7,
    companyId: 57,
    role: MembershipRole.ADMIN,
    status: MembershipStatus.ACTIVE,
    accessScope: AccessScopeLevel.COMPANY,
    companyRole: null,
    unitAccess: [],
    permissionOverrides: [],
    company: {
      units: [{ id: 10 }],
      moduleSidebar,
      subscriptions: planSubscriptions,
    },
  };
}

function buildEnabledModule(moduleId: number, code: string, name: string) {
  return {
    moduleId,
    module: {
      id: moduleId,
      code,
      name,
      description: null,
      icon: 'calendar',
      category: 'STANDARD',
      permissions: [{ code }],
    },
  };
}
