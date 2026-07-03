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
import { EntitlementService } from './entitlements/entitlement.service';
import { PermissionService } from './permissions/permission.service';
import { SidebarBuilder } from './sidebar/sidebar-builder.service';

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
 * - Phase 5: keep this service as the thin AuthUser orchestration layer.
 */
@Injectable()
export class AccessControlService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly entitlementService: EntitlementService,
    private readonly permissionService: PermissionService,
    private readonly sidebarBuilder: SidebarBuilder,
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
    const permissions = this.permissionService.computePermissions(
      membership,
      enabledModules,
    );
    const userModules = this.sidebarBuilder.buildUserModules(
      membership,
      permissions,
    );
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

  // Company role resolution

  private getEffectiveCompanyRole(membership: MembershipAccessRecord) {
    return (
      membership.companyRole ??
      membership.unitAccess.find((unitAccess) => unitAccess.companyRole)
        ?.companyRole ??
      null
    );
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
