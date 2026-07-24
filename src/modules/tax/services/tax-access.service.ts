import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { MembershipStatus } from '@prisma/client';
import { AppRole } from '../../../common/enums/app-role.enum';
import { PermissionAction } from '../../../common/enums/permission-action.enum';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class TaxAccessService {
  constructor(private readonly prisma: PrismaService) {}

  assertCan(user: AuthUser, action: PermissionAction) {
    if (this.can(user, action)) {
      return;
    }

    throw new ForbiddenException('Tax definitions are system-seeded and can only be maintained by a superadmin.');
  }

  getActiveCompanyId(user: AuthUser) {
    if (!user.companyId) {
      throw new BadRequestException('Select an active company first.');
    }

    return user.companyId;
  }

  getOptionalActiveCompanyId(user: AuthUser) {
    return user.companyId ?? undefined;
  }

  async assertCompanyAccess(user: AuthUser, companyId: number) {
    if (user.role === AppRole.SUPER_ADMIN) {
      return;
    }

    const membership = await this.prisma.membership.findUnique({
      where: {
        userId_companyId: {
          userId: user.id,
          companyId,
        },
      },
      select: { status: true },
    });

    if (!membership || membership.status !== MembershipStatus.ACTIVE) {
      throw new NotFoundException('Company not found.');
    }
  }

  getPermissions(user: AuthUser) {
    return {
      canView: this.can(user, PermissionAction.VIEW),
      canCreate: this.can(user, PermissionAction.CREATE),
      canUpdate: this.can(user, PermissionAction.UPDATE),
      canExport: this.can(user, PermissionAction.EXPORT),
      canImport: this.can(user, PermissionAction.CREATE),
    };
  }

  private can(user: AuthUser, action: PermissionAction) {
    return action === PermissionAction.VIEW || user.role === AppRole.SUPER_ADMIN;
  }
}
