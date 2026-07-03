import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CompanyStatus,
  MembershipRole,
  MembershipStatus,
  Prisma,
  SystemRole,
  UserStatus,
} from '@prisma/client';
import { AppRole } from '../enums/app-role.enum';
import { PermissionAction } from '../enums/permission-action.enum';
import { AuthUser } from '../interfaces/auth-user.interface';
import type { AuthUserModuleItem } from '../interfaces/auth-user.interface';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { getSubscriptionAccessDenialReason } from '../utils/subscription-access.util';
import { EntitlementService } from './entitlements/entitlement.service';

type MembershipAccessRecord = Prisma.MembershipGetPayload<{
  include: {
    company: {
      include: {
        subscriptions: {
          include: {
            plan: {
              include: {
                systems: {
                  where: { isEnabled: true; system: { isActive: true } };
                  include: {
                    system: {
                      include: {
                        sidebarItems: {
                          where: { isVisible: true };
                          include: {
                            module: {
                              include: {
                                permissions: {
                                  where: { isActive: true };
                                  orderBy: { id: 'asc' };
                                };
                              };
                            };
                          };
                          orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }];
                        };
                      };
                    };
                  };
                  orderBy: [{ system: { sortOrder: 'asc' } }];
                };
              };
            };
          };
          orderBy: [{ startsAt: 'desc' }, { createdAt: 'desc' }];
          take: 1;
        };
        units: {
          where: {
            isActive: true;
          };
          select: {
            id: true;
          };
          orderBy: {
            id: 'asc';
          };
        };
        enabledModules: {
          where: {
            isEnabled: true;
            module: {
              isActive: true;
            };
          };
          select: {
            moduleId: true;
            module: {
              include: {
                permissions: {
                  where: {
                    isActive: true;
                  };
                  orderBy: {
                    id: 'asc';
                  };
                };
              };
            };
          };
        };
        moduleSidebar: {
          include: {
            module: {
              include: {
                permissions: {
                  where: {
                    isActive: true;
                  };
                  orderBy: {
                    id: 'asc';
                  };
                };
              };
            };
          };
          orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }];
        };
      };
    };
    companyRole: {
      include: {
        permissions: {
          where: {
            permission: {
              isActive: true;
              module: { isActive: true };
            };
          };
          include: {
            permission: {
              include: { module: true };
            };
          };
        };
      };
    };
    unitAccess: {
      include: {
        companyRole: {
          include: {
            permissions: {
              where: {
                permission: {
                  isActive: true;
                  module: { isActive: true };
                };
              };
              include: {
                permission: {
                  include: { module: true };
                };
              };
            };
          };
        };
      };
    };
    permissionOverrides: {
      where: {
        permission: {
          isActive: true;
          module: { isActive: true };
        };
      };
      include: {
        permission: {
          include: { module: true };
        };
      };
    };
  };
}>;

type ActiveUserRecord = {
  id: number;
  systemRole: SystemRole;
};

/*
 * AccessControlService currently assembles the complete runtime AuthUser
 * context: active user, company membership, subscription availability, enabled
 * modules, permissions, and sidebar data.
 *
 * TODO authorization roadmap:
 * - Phase 2: extract effective module entitlement resolution.
 * - Phase 3: extract permission aggregation and override application.
 * - Phase 4: extract sidebar/template/user-preference building.
 * - Phase 5: keep this service as the thin AuthUser orchestration layer.
 */
@Injectable()
export class AccessControlService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly entitlementService: EntitlementService,
  ) {}

  async resolveAuthUser(payload: JwtPayload): Promise<AuthUser> {
    const user = await this.getActiveUser(payload.sub);

    if (user.systemRole === SystemRole.SUPER_ADMIN) {
      return this.buildSuperAdminAuthUser(user, payload.companyId ?? null);
    }

    if (payload.companyId == null) {
      return this.buildUserWithoutCompanyContext(user);
    }

    const membership = await this.getMembershipAccess(
      user.id,
      payload.companyId,
    );

    this.assertMembershipIsUsable(membership);

    return this.buildCompanyAuthUser(user, membership);
  }

  hasPermission(
    user: AuthUser,
    permissionCode: string,
    action: PermissionAction,
  ): boolean {
    if (user.role === AppRole.SUPER_ADMIN) {
      return true;
    }

    if (!user.companyId) {
      return false;
    }

    return user.permissions.includes(
      this.buildPermissionKey(permissionCode, action),
    );
  }

  assertCompanyContext(user: AuthUser): void {
    if (user.role === AppRole.SUPER_ADMIN) {
      return;
    }

    if (!user.companyId) {
      throw new ForbiddenException('An active company context is required.');
    }
  }

  // Authentication context

  private async getActiveUser(userId: number): Promise<ActiveUserRecord> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        systemRole: true,
        status: true,
      },
    });

    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('User account is not active.');
    }

    return {
      id: user.id,
      systemRole: user.systemRole,
    };
  }

  private buildSuperAdminAuthUser(
    user: ActiveUserRecord,
    companyId: number | null,
  ): AuthUser {
    return {
      id: user.id,
      companyId,
      role: AppRole.SUPER_ADMIN,
      systemRole: user.systemRole,
      membershipRole: null,
      membershipStatus: null,
      companyRoleId: null,
      companyRoleCode: null,
      companyRoleName: null,
      accessScope: null,
      enabledModules: [],
      permissions: [],
      userModules: this.buildEmptyUserModules(),
    };
  }

  private buildUserWithoutCompanyContext(user: ActiveUserRecord): AuthUser {
    return {
      id: user.id,
      companyId: null,
      role: AppRole.USER,
      systemRole: user.systemRole,
      membershipRole: null,
      membershipStatus: null,
      companyRoleId: null,
      companyRoleCode: null,
      companyRoleName: null,
      accessScope: null,
      enabledModules: [],
      permissions: [],
      userModules: this.buildEmptyUserModules(),
    };
  }

  private buildCompanyAuthUser(
    user: ActiveUserRecord,
    membership: MembershipAccessRecord,
  ): AuthUser {
    const enabledModules =
      this.entitlementService.getEnabledModuleCodes(membership);
    const permissions = this.buildEffectivePermissions(
      membership,
      enabledModules,
    );
    const userModules = this.buildUserModules(membership, permissions);
    const effectiveCompanyRole = this.getEffectiveCompanyRole(membership);

    return {
      id: user.id,
      companyId: membership.companyId,
      role: this.mapMembershipRole(membership.role),
      systemRole: user.systemRole,
      membershipRole: membership.role,
      membershipStatus: membership.status,
      companyRoleId: effectiveCompanyRole?.id ?? null,
      companyRoleCode: effectiveCompanyRole?.code ?? null,
      companyRoleName: effectiveCompanyRole?.name ?? null,
      accessScope: membership.accessScope,
      enabledModules,
      permissions,
      userModules,
    };
  }

  private buildEmptyUserModules() {
    return { items: [], byBranch: [] };
  }

  // Company and membership resolution

  private async getMembershipAccess(
    userId: number,
    companyId: number,
  ): Promise<MembershipAccessRecord> {
    const membership = await this.prisma.membership.findUnique({
      where: {
        userId_companyId: {
          userId,
          companyId,
        },
      },
      include: {
        company: {
          include: {
            subscriptions: {
              include: {
                plan: {
                  include: {
                    systems: {
                      where: { isEnabled: true, system: { isActive: true } },
                      include: {
                        system: {
                          include: {
                            sidebarItems: {
                              where: { isVisible: true },
                              include: {
                                module: {
                                  include: {
                                    permissions: {
                                      where: { isActive: true },
                                      orderBy: { id: 'asc' },
                                    },
                                  },
                                },
                              },
                              orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
                            },
                          },
                        },
                      },
                      orderBy: [{ system: { sortOrder: 'asc' } }],
                    },
                  },
                },
              },
              orderBy: [{ startsAt: 'desc' }, { createdAt: 'desc' }],
              take: 1,
            },
            units: {
              where: {
                isActive: true,
              },
              select: {
                id: true,
              },
              orderBy: {
                id: 'asc',
              },
            },
            enabledModules: {
              where: {
                isEnabled: true,
                module: {
                  isActive: true,
                },
              },
              select: {
                moduleId: true,
                module: {
                  include: {
                    permissions: {
                      where: {
                        isActive: true,
                      },
                      orderBy: {
                        id: 'asc',
                      },
                    },
                  },
                },
              },
            },
            moduleSidebar: {
              where: {
                userId,
              },
              include: {
                module: {
                  include: {
                    permissions: {
                      where: {
                        isActive: true,
                      },
                      orderBy: {
                        id: 'asc',
                      },
                    },
                  },
                },
              },
              orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
            },
          },
        },
        companyRole: {
          include: {
            permissions: {
              where: {
                permission: {
                  isActive: true,
                  module: { isActive: true },
                },
              },
              include: {
                permission: {
                  include: { module: true },
                },
              },
            },
          },
        },
        unitAccess: {
          include: {
            companyRole: {
              include: {
                permissions: {
                  where: {
                    permission: {
                      isActive: true,
                      module: { isActive: true },
                    },
                  },
                  include: {
                    permission: {
                      include: { module: true },
                    },
                  },
                },
              },
            },
          },
        },
        permissionOverrides: {
          where: {
            permission: {
              isActive: true,
              module: { isActive: true },
            },
          },
          include: {
            permission: {
              include: { module: true },
            },
          },
        },
      },
    });

    if (!membership) {
      throw new UnauthorizedException('You do not belong to this company.');
    }

    return membership;
  }

  // Company and subscription availability

  private assertMembershipIsUsable(membership: MembershipAccessRecord): void {
    if (membership.status !== MembershipStatus.ACTIVE) {
      throw new UnauthorizedException('Your company membership is not active.');
    }

    if (!membership.company.isActive) {
      throw new UnauthorizedException('This company is inactive.');
    }

    if (
      membership.company.status === CompanyStatus.SUSPENDED ||
      membership.company.status === CompanyStatus.FAILED
    ) {
      throw new UnauthorizedException('This company is unavailable.');
    }

    const latestSubscription = membership.company.subscriptions[0];

    if (!latestSubscription) {
      return;
    }

    const denialReason = getSubscriptionAccessDenialReason(
      latestSubscription,
      new Date(),
      {
        allowProviderActivationFallback: this.isProviderFallbackAllowed(),
      },
    );

    if (denialReason) {
      throw new UnauthorizedException(denialReason);
    }
  }

  private isProviderFallbackAllowed() {
    return (
      this.configService
        .get<string>('PAYMONGO_ALLOW_PROVIDER_FALLBACK', 'false')
        .toLowerCase() === 'true'
    );
  }

  // Module and permission resolution

  private getEffectiveCompanyRole(membership: MembershipAccessRecord) {
    return (
      membership.companyRole ??
      membership.unitAccess.find((unitAccess) => unitAccess.companyRole)
        ?.companyRole ??
      null
    );
  }

  private buildEffectivePermissions(
    membership: MembershipAccessRecord,
    enabledModules: string[],
  ): string[] {
    const permissions = new Map<string, Record<PermissionAction, boolean>>();

    const rolePermissions = [
      ...(membership.companyRole?.permissions ?? []),
      ...membership.unitAccess.flatMap(
        (unitAccess) => unitAccess.companyRole?.permissions ?? [],
      ),
    ];

    for (const rolePermission of rolePermissions) {
      if (
        !this.isPermissionWithinEnabledModules(
          rolePermission.permission,
          enabledModules,
        )
      ) {
        continue;
      }

      const current = permissions.get(rolePermission.permission.code);
      permissions.set(rolePermission.permission.code, {
        [PermissionAction.VIEW]:
          Boolean(current?.view) || rolePermission.canView,
        [PermissionAction.CREATE]:
          Boolean(current?.create) || rolePermission.canCreate,
        [PermissionAction.UPDATE]:
          Boolean(current?.update) || rolePermission.canUpdate,
        [PermissionAction.CANCEL]:
          Boolean(current?.cancel) || rolePermission.canCancel,
        [PermissionAction.UNCANCEL]:
          Boolean(current?.uncancel) || rolePermission.canUncancel,
        [PermissionAction.EXPORT]:
          Boolean(current?.export) || rolePermission.canExport,
      });
    }

    for (const override of membership.permissionOverrides) {
      if (
        !this.isPermissionWithinEnabledModules(
          override.permission,
          enabledModules,
        )
      ) {
        continue;
      }

      const current = permissions.get(override.permission.code) ?? {
        [PermissionAction.VIEW]: false,
        [PermissionAction.CREATE]: false,
        [PermissionAction.UPDATE]: false,
        [PermissionAction.CANCEL]: false,
        [PermissionAction.UNCANCEL]: false,
        [PermissionAction.EXPORT]: false,
      };

      permissions.set(override.permission.code, {
        [PermissionAction.VIEW]: override.canView ?? current.view,
        [PermissionAction.CREATE]: override.canCreate ?? current.create,
        [PermissionAction.UPDATE]: override.canUpdate ?? current.update,
        [PermissionAction.CANCEL]: override.canCancel ?? current.cancel,
        [PermissionAction.UNCANCEL]: override.canUncancel ?? current.uncancel,
        [PermissionAction.EXPORT]: override.canExport ?? current.export,
      });
    }

    return Array.from(permissions.entries()).flatMap(
      ([permissionCode, actions]) =>
        Object.values(PermissionAction)
          .filter((action) => actions[action])
          .map((action) => this.buildPermissionKey(permissionCode, action)),
    );
  }

  private isPermissionWithinEnabledModules(
    permission: { module?: { code: string } | null },
    enabledModules: string[],
  ): boolean {
    const moduleCode = getPermissionModuleCode(permission);

    return (
      !moduleCode ||
      enabledModules.length === 0 ||
      enabledModules.includes(moduleCode)
    );
  }

  // Sidebar resolution and customization fallback

  private buildUserModules(
    membership: MembershipAccessRecord,
    permissions: string[],
  ) {
    const permissionSet = new Set(permissions);
    const hasAdminModuleAccess = membership.role === MembershipRole.ADMIN;
    const enabledModuleIds =
      this.entitlementService.getEnabledModuleIds(membership);
    const permittedItems = this.getPermittedSidebarItems(
      membership,
      enabledModuleIds,
      permissionSet,
      hasAdminModuleAccess,
    );
    const permittedSidebarModuleIds = new Set(
      permittedItems.flatMap((item) =>
        item.itemType === 'LINK' && item.moduleId ? [item.moduleId] : [],
      ),
    );
    const permittedEnabledModules =
      this.entitlementService.getPermittedEnabledModules(
        membership.company.enabledModules,
        permissionSet,
        hasAdminModuleAccess,
      );
    const fallbackItems = permittedEnabledModules
      .filter((item) => !permittedSidebarModuleIds.has(item.moduleId))
      .map((item) => buildFallbackUserModuleItem(item.module));
    const branchIds = this.getAccessibleBranchIds(membership, permittedItems);
    const systemSidebarItems = getActiveSystemSidebarItems(membership);
    const byBranch = branchIds.map((branchUnitId) =>
      this.buildBranchModuleAccess(
        membership,
        branchUnitId,
        permittedItems,
        permittedEnabledModules,
        systemSidebarItems,
      ),
    );

    return { items: byBranch[0]?.items ?? fallbackItems, byBranch };
  }

  private getPermittedSidebarItems(
    membership: MembershipAccessRecord,
    enabledModuleIds: Set<number>,
    permissionSet: Set<string>,
    hasAdminModuleAccess: boolean,
  ): UserModuleRecord[] {
    return membership.company.moduleSidebar.filter((item) =>
      this.isSidebarItemPermitted(
        item,
        enabledModuleIds,
        permissionSet,
        hasAdminModuleAccess,
      ),
    );
  }

  private isSidebarItemPermitted(
    item: UserModuleRecord,
    enabledModuleIds: Set<number>,
    permissionSet: Set<string>,
    hasAdminModuleAccess: boolean,
  ): boolean {
    if (item.itemType !== 'LINK') {
      return true;
    }

    if (!item.module || !item.moduleId || !item.module.isActive) {
      return false;
    }

    if (!enabledModuleIds.has(item.moduleId)) {
      return false;
    }

    return this.entitlementService.hasModulePermission(
      item.module,
      permissionSet,
      hasAdminModuleAccess,
    );
  }

  private getAccessibleBranchIds(
    membership: MembershipAccessRecord,
    permittedItems: UserModuleRecord[],
  ): number[] {
    const defaultBranchIds =
      membership.role === MembershipRole.ADMIN ||
      membership.accessScope === 'COMPANY' ||
      membership.unitAccess.length === 0
        ? membership.company.units.map((item) => item.id)
        : membership.unitAccess.map((item) => item.unitId);

    return Array.from(
      new Set([
        ...defaultBranchIds,
        ...membership.unitAccess.map((item) => item.unitId),
        ...permittedItems.map((item) => item.branchUnitId),
      ]),
    );
  }

  private buildBranchModuleAccess(
    membership: MembershipAccessRecord,
    branchUnitId: number,
    permittedItems: UserModuleRecord[],
    permittedEnabledModules: EnabledCompanyModuleRecord[],
    systemSidebarItems: SystemSidebarRecord[],
  ) {
    const branchAccess = membership.unitAccess.find(
      (item) => item.unitId === branchUnitId,
    );

    return {
      branchUnitId,
      companyRoleId: branchAccess?.companyRole?.id ?? null,
      companyRoleCode: branchAccess?.companyRole?.code ?? null,
      companyRoleName: branchAccess?.companyRole?.name ?? null,
      items: buildBranchUserModules({
        customItems: permittedItems.filter(
          (item) => item.branchUnitId === branchUnitId,
        ),
        enabledModules: permittedEnabledModules,
        systemSidebarItems,
      }),
    };
  }

  // Shared utilities

  private buildPermissionKey(
    permissionCode: string,
    action: PermissionAction,
  ): string {
    return `${permissionCode}:${action}`;
  }

  private mapMembershipRole(role: MembershipRole): AppRole {
    return role === MembershipRole.ADMIN ? AppRole.ADMIN : AppRole.USER;
  }
}

function getPermissionModuleCode(permission: {
  module?: { code: string } | null;
}) {
  const legacy = permission as typeof permission & {
    submodule?: { module: { code: string } } | null;
  };
  return permission.module?.code ?? legacy.submodule?.module.code;
}

type UserModuleRecord =
  MembershipAccessRecord['company']['moduleSidebar'][number];
type EnabledUserModuleRecord =
  MembershipAccessRecord['company']['enabledModules'][number]['module'];
type EnabledCompanyModuleRecord =
  MembershipAccessRecord['company']['enabledModules'][number];
type SystemSidebarRecord =
  MembershipAccessRecord['company']['subscriptions'][number]['plan']['systems'][number]['system']['sidebarItems'][number] & {
    systemCode: string;
  };

function getActiveSystemSidebarItems(membership: MembershipAccessRecord) {
  const subscription = membership.company.subscriptions[0];

  if (!subscription) {
    return [];
  }

  return subscription.plan.systems.flatMap((planSystem) =>
    planSystem.system.sidebarItems.map((item) => ({
      ...item,
      systemCode: planSystem.system.code,
    })),
  );
}

function buildBranchUserModules({
  customItems,
  enabledModules,
  systemSidebarItems,
}: {
  customItems: UserModuleRecord[];
  enabledModules: EnabledCompanyModuleRecord[];
  systemSidebarItems: SystemSidebarRecord[];
}) {
  if (customItems.length) {
    const customTree = buildUserModuleTree(customItems);
    const customModuleIds = collectModuleIds(customTree);
    return [
      ...customTree,
      ...buildMissingFallbackItems(enabledModules, customModuleIds),
    ];
  }

  const systemTree = buildSystemSidebarTree(systemSidebarItems, enabledModules);
  const systemModuleIds = collectModuleIds(systemTree);

  return [
    ...systemTree,
    ...buildMissingFallbackItems(enabledModules, systemModuleIds),
  ];
}

function buildMissingFallbackItems(
  enabledModules: EnabledCompanyModuleRecord[],
  existingModuleIds: Set<number>,
) {
  return enabledModules
    .filter((item) => !existingModuleIds.has(item.moduleId))
    .map((item) => buildFallbackUserModuleItem(item.module));
}

function collectModuleIds(items: AuthUserModuleItem[]) {
  const moduleIds = new Set<number>();
  const visit = (item: AuthUserModuleItem) => {
    if (item.moduleId != null) {
      moduleIds.add(item.moduleId);
    }
    item.children.forEach(visit);
  };
  items.forEach(visit);
  return moduleIds;
}

function buildFallbackUserModuleItem(
  module: EnabledUserModuleRecord,
): AuthUserModuleItem {
  const permission = module.permissions[0];
  const routeKey = `module-${module.code.toLowerCase()}`;

  return {
    id: -module.id,
    key: routeKey || module.code.toLowerCase(),
    label: module.name,
    description: module.description,
    itemType: 'LINK',
    iconName: module.icon,
    sortOrder: Number.MAX_SAFE_INTEGER,
    moduleId: module.id,
    moduleCode: module.code,
    permissionCode: permission?.code ?? null,
    requiredActions: permission ? ['view'] : [],
    category: module.category,
    children: [],
  };
}

function buildSystemSidebarTree(
  items: SystemSidebarRecord[],
  enabledModules: EnabledCompanyModuleRecord[],
) {
  const enabledModulesById = new Map(
    enabledModules.map((item) => [item.moduleId, item.module]),
  );
  const byParent = new Map<number | null, SystemSidebarRecord[]>();
  const renderedModuleIds = new Set<number>();

  for (const item of items) {
    const siblings = byParent.get(item.parentId) ?? [];
    siblings.push(item);
    byParent.set(item.parentId, siblings);
  }

  const visit = (parentId: number | null): AuthUserModuleItem[] =>
    (byParent.get(parentId) ?? []).flatMap((item): AuthUserModuleItem[] => {
      if (item.itemType === 'LINK') {
        if (
          item.moduleId == null ||
          renderedModuleIds.has(item.moduleId) ||
          !enabledModulesById.has(item.moduleId)
        ) {
          return [];
        }

        const module = enabledModulesById.get(item.moduleId)!;
        const permission = module.permissions[0];

        renderedModuleIds.add(item.moduleId);

        return [
          {
            id: -item.id,
            key: `${item.systemCode.toLowerCase()}-${item.key}`,
            label: item.label,
            description: item.description,
            itemType: 'LINK',
            iconName: item.iconName,
            sortOrder: item.sortOrder,
            moduleId: item.moduleId,
            moduleCode: module.code,
            permissionCode: permission?.code ?? null,
            requiredActions: permission ? ['view'] : [],
            category: module.category,
            children: [],
          },
        ];
      }

      const children = visit(item.id);

      if (!children.length) {
        return [];
      }

      return [
        {
          id: -item.id,
          key: `${item.systemCode.toLowerCase()}-${item.key}`,
          label: item.label,
          description: item.description,
          itemType: item.itemType,
          iconName: item.iconName,
          sortOrder: item.sortOrder,
          moduleId: null,
          moduleCode: null,
          permissionCode: null,
          requiredActions: [],
          category: null,
          children,
        },
      ];
    });

  return visit(null);
}

function buildUserModuleTree(items: UserModuleRecord[]) {
  const byParent = new Map<number | null, UserModuleRecord[]>();

  for (const item of items) {
    const siblings = byParent.get(item.parentId) ?? [];
    siblings.push(item);
    byParent.set(item.parentId, siblings);
  }

  const visit = (parentId: number | null): AuthUserModuleItem[] =>
    (byParent.get(parentId) ?? []).flatMap((item) => {
      const children = visit(item.id);

      if (item.itemType !== 'LINK' && !children.length) {
        return [];
      }

      const permission = item.module?.permissions[0];

      return [
        {
          id: item.id,
          key: item.key,
          label: item.label,
          description: item.description,
          itemType: item.itemType,
          iconName: item.iconName,
          sortOrder: item.sortOrder,
          moduleId: item.moduleId,
          moduleCode: item.module?.code ?? null,
          permissionCode: permission?.code ?? null,
          requiredActions: permission ? ['view'] : [],
          category: item.module?.category ?? null,
          children,
        },
      ];
    });

  return visit(null);
}
