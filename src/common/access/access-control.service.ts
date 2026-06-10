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
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { getSubscriptionAccessDenialReason } from '../utils/subscription-access.util';

type MembershipAccessRecord = Prisma.MembershipGetPayload<{
  include: {
    company: {
      include: {
        subscriptions: {
          orderBy: [{ startsAt: 'desc' }, { createdAt: 'desc' }];
          take: 1;
        };
        enabledModules: {
          where: {
            isEnabled: true;
            module: {
              isActive: true;
            };
          };
          select: {
            module: {
              select: {
                code: true;
              };
            };
          };
        };
      };
    };
    companyRole: {
      include: {
        permissions: {
          where: {
            permission: {
              isActive: true;
              OR: [
                {
                  targetType: 'MODULE';
                  module: { isActive: true };
                },
                {
                  targetType: 'SUBMODULE';
                  module: { isActive: true };
                  submodule: {
                    isActive: true;
                    module: { isActive: true };
                  };
                },
              ];
            };
          };
          include: {
            permission: {
              include: {
                module: true;
                submodule: {
                  include: {
                    module: true;
                  };
                };
              };
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
                  OR: [
                    {
                      targetType: 'MODULE';
                      module: { isActive: true };
                    },
                    {
                      targetType: 'SUBMODULE';
                      module: { isActive: true };
                      submodule: {
                        isActive: true;
                        module: { isActive: true };
                      };
                    },
                  ];
                };
              };
              include: {
                permission: {
                  include: {
                    module: true;
                    submodule: {
                      include: {
                        module: true;
                      };
                    };
                  };
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
          OR: [
            {
              targetType: 'MODULE';
              module: { isActive: true };
            },
            {
              targetType: 'SUBMODULE';
              module: { isActive: true };
              submodule: {
                isActive: true;
                module: { isActive: true };
              };
            },
          ];
        };
      };
      include: {
        permission: {
          include: {
            module: true;
            submodule: {
              include: {
                module: true;
              };
            };
          };
        };
      };
    };
  };
}>;

@Injectable()
export class AccessControlService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async resolveAuthUser(payload: JwtPayload): Promise<AuthUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        systemRole: true,
        status: true,
      },
    });

    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('User account is not active.');
    }

    if (user.systemRole === SystemRole.SUPER_ADMIN) {
      return {
        id: user.id,
        companyId: payload.companyId ?? null,
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
      };
    }

    if (payload.companyId == null) {
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
      };
    }

    const membership = await this.getMembershipAccess(
      user.id,
      payload.companyId,
    );

    this.assertMembershipIsUsable(membership);

    const enabledModules = membership.company.enabledModules.map(
      (item) => item.module.code,
    );
    const permissions = this.buildEffectivePermissions(
      membership,
      enabledModules,
    );
    const effectiveCompanyRole =
      membership.companyRole ??
      membership.unitAccess.find((unitAccess) => unitAccess.companyRole)
        ?.companyRole ??
      null;

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
    };
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
              orderBy: [{ startsAt: 'desc' }, { createdAt: 'desc' }],
              take: 1,
            },
            enabledModules: {
              where: {
                isEnabled: true,
                module: {
                  isActive: true,
                },
              },
              select: {
                module: {
                  select: {
                    code: true,
                  },
                },
              },
            },
          },
        },
        companyRole: {
          include: {
            permissions: {
              where: {
                permission: {
                  isActive: true,
                  OR: [
                    {
                      targetType: 'MODULE',
                      module: { isActive: true },
                    },
                    {
                      targetType: 'SUBMODULE',
                      module: { isActive: true },
                      submodule: {
                        isActive: true,
                        module: { isActive: true },
                      },
                    },
                  ],
                },
              },
              include: {
                permission: {
                  include: {
                    module: true,
                    submodule: {
                      include: {
                        module: true,
                      },
                    },
                  },
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
                      OR: [
                        {
                          targetType: 'MODULE',
                          module: { isActive: true },
                        },
                        {
                          targetType: 'SUBMODULE',
                          module: { isActive: true },
                          submodule: {
                            isActive: true,
                            module: { isActive: true },
                          },
                        },
                      ],
                    },
                  },
                  include: {
                    permission: {
                      include: {
                        module: true,
                        submodule: {
                          include: {
                            module: true,
                          },
                        },
                      },
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
              OR: [
                {
                  targetType: 'MODULE',
                  module: { isActive: true },
                },
                {
                  targetType: 'SUBMODULE',
                  module: { isActive: true },
                  submodule: {
                    isActive: true,
                    module: { isActive: true },
                  },
                },
              ],
            },
          },
          include: {
            permission: {
              include: {
                module: true,
                submodule: {
                  include: {
                    module: true,
                  },
                },
              },
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
      const moduleCode =
        rolePermission.permission.module?.code ??
        rolePermission.permission.submodule?.module.code;

      if (
        moduleCode &&
        enabledModules.length > 0 &&
        !enabledModules.includes(moduleCode)
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
        [PermissionAction.DELETE]: false,
        [PermissionAction.APPROVE]: false,
        [PermissionAction.CANCEL]:
          Boolean(current?.cancel) || rolePermission.canCancel,
        [PermissionAction.UNCANCEL]:
          Boolean(current?.uncancel) || rolePermission.canUncancel,
        [PermissionAction.EXPORT]:
          Boolean(current?.export) || rolePermission.canExport,
      });
    }

    for (const override of membership.permissionOverrides) {
      const moduleCode =
        override.permission.module?.code ??
        override.permission.submodule?.module.code;

      if (
        moduleCode &&
        enabledModules.length > 0 &&
        !enabledModules.includes(moduleCode)
      ) {
        continue;
      }

      const current = permissions.get(override.permission.code) ?? {
        [PermissionAction.VIEW]: false,
        [PermissionAction.CREATE]: false,
        [PermissionAction.UPDATE]: false,
        [PermissionAction.DELETE]: false,
        [PermissionAction.APPROVE]: false,
        [PermissionAction.CANCEL]: false,
        [PermissionAction.UNCANCEL]: false,
        [PermissionAction.EXPORT]: false,
      };

      permissions.set(override.permission.code, {
        [PermissionAction.VIEW]: override.canView ?? current.view,
        [PermissionAction.CREATE]: override.canCreate ?? current.create,
        [PermissionAction.UPDATE]: override.canUpdate ?? current.update,
        [PermissionAction.DELETE]: false,
        [PermissionAction.APPROVE]: false,
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
