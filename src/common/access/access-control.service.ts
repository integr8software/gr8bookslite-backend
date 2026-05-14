import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
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
    company: true;
    companyRole: {
      include: {
        permissions: {
          include: {
            permission: {
              include: {
                module: true;
              };
            };
          };
        };
      };
    };
    permissionOverrides: {
      include: {
        permission: {
          include: {
            module: true;
          };
        };
      };
    };
  };
}>;

@Injectable()
export class AccessControlService {
  constructor(private readonly prisma: PrismaService) {}

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
        accessScope: null,
        enabledModules: [],
        permissions: [],
      };
    }

    const membership = await this.getMembershipAccess(
      user.id,
      payload.companyId,
    );

    await this.assertMembershipIsUsable(membership);

    const enabledModules = await this.getEnabledModules(membership.companyId);
    const permissions = this.buildEffectivePermissions(
      membership,
      enabledModules,
    );

    return {
      id: user.id,
      companyId: membership.companyId,
      role: this.mapMembershipRole(membership.role),
      systemRole: user.systemRole,
      membershipRole: membership.role,
      membershipStatus: membership.status,
      companyRoleId: membership.companyRoleId,
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

    const moduleCode = permissionCode.split('.')[0];

    if (!moduleCode || !user.enabledModules.includes(moduleCode)) {
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
        company: true,
        companyRole: {
          include: {
            permissions: {
              include: {
                permission: {
                  include: {
                    module: true,
                  },
                },
              },
            },
          },
        },
        permissionOverrides: {
          include: {
            permission: {
              include: {
                module: true,
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

  private async assertMembershipIsUsable(
    membership: MembershipAccessRecord,
  ): Promise<void> {
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

    const latestSubscription = await this.prisma.companySubscription.findFirst({
      where: {
        companyId: membership.companyId,
      },
      orderBy: [{ startsAt: 'desc' }, { createdAt: 'desc' }],
    });

    if (!latestSubscription) {
      return;
    }

    const denialReason = getSubscriptionAccessDenialReason(
      latestSubscription,
      new Date(),
    );

    if (denialReason) {
      throw new UnauthorizedException(denialReason);
    }
  }

  private async getEnabledModules(companyId: number): Promise<string[]> {
    const modules = await this.prisma.companyModule.findMany({
      where: {
        companyId,
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
    });

    return modules.map((item) => item.module.code);
  }

  private buildEffectivePermissions(
    membership: MembershipAccessRecord,
    enabledModules: string[],
  ): string[] {
    const permissions = new Map<string, Record<PermissionAction, boolean>>();

    for (const rolePermission of membership.companyRole?.permissions ?? []) {
      const moduleCode = rolePermission.permission.module.code;

      if (!enabledModules.includes(moduleCode)) {
        continue;
      }

      permissions.set(rolePermission.permission.code, {
        [PermissionAction.VIEW]: rolePermission.canView,
        [PermissionAction.CREATE]: rolePermission.canCreate,
        [PermissionAction.UPDATE]: rolePermission.canUpdate,
        [PermissionAction.DELETE]: rolePermission.canDelete,
        [PermissionAction.APPROVE]: rolePermission.canApprove,
        [PermissionAction.EXPORT]: rolePermission.canExport,
      });
    }

    for (const override of membership.permissionOverrides) {
      const moduleCode = override.permission.module.code;

      if (!enabledModules.includes(moduleCode)) {
        continue;
      }

      const current = permissions.get(override.permission.code) ?? {
        [PermissionAction.VIEW]: false,
        [PermissionAction.CREATE]: false,
        [PermissionAction.UPDATE]: false,
        [PermissionAction.DELETE]: false,
        [PermissionAction.APPROVE]: false,
        [PermissionAction.EXPORT]: false,
      };

      permissions.set(override.permission.code, {
        [PermissionAction.VIEW]: override.canView ?? current.view,
        [PermissionAction.CREATE]: override.canCreate ?? current.create,
        [PermissionAction.UPDATE]: override.canUpdate ?? current.update,
        [PermissionAction.DELETE]: override.canDelete ?? current.delete,
        [PermissionAction.APPROVE]: override.canApprove ?? current.approve,
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
