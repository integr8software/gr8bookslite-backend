import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AccessScopeLevel,
  CompanyRoleType,
  MembershipRole,
  MembershipStatus,
} from '@prisma/client';
import { AppRole } from '../../../common/enums/app-role.enum';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { PrismaService } from '../../../prisma/prisma.service';
import { UpdateBranchUserRoleDto } from './dto/update-branch-user-role.dto';
import {
  mapBranchUser,
  mapBranchUserRole,
} from './mappers/branch-user.mapper';
import {
  BranchUserMembershipInclude,
  BranchUserRoleInclude,
} from './prisma/branch-user.include';

@Injectable()
export class BranchUsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(user: AuthUser, unitId: number) {
    const unit = await this.getUnitOrThrow(unitId);
    await this.ensureCanManageUnitUsers(user, unit.companyId);

    const memberships = await this.prisma.membership.findMany({
      where: {
        companyId: unit.companyId,
        status: {
          not: MembershipStatus.REMOVED,
        },
        unitAccess: {
          some: {
            unitId,
          },
        },
      },
      include: BranchUserMembershipInclude,
      orderBy: [{ user: { name: 'asc' } }, { user: { email: 'asc' } }],
    });

    return {
      unit: {
        id: unit.id,
        companyId: unit.companyId,
        code: unit.code,
        name: unit.name,
        displayName: unit.displayName,
        type: unit.type,
      },
      users: memberships.map(mapBranchUser),
    };
  }

  async findAssignableRoles(user: AuthUser, unitId: number) {
    const unit = await this.getUnitOrThrow(unitId);
    await this.ensureCanManageUnitUsers(user, unit.companyId);

    const roles = await this.prisma.companyRole.findMany({
      where: {
        companyId: unit.companyId,
        isActive: true,
        roleType: {
          not: CompanyRoleType.ADMIN,
        },
        scopeLevel: {
          in: [AccessScopeLevel.COMPANY, AccessScopeLevel.BRANCH],
        },
      },
      include: BranchUserRoleInclude,
      orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
    });

    return {
      roles: roles.map(mapBranchUserRole),
    };
  }

  async updateRole(
    user: AuthUser,
    unitId: number,
    targetUserId: number,
    dto: UpdateBranchUserRoleDto,
  ) {
    const unit = await this.getUnitOrThrow(unitId);
    await this.ensureCanManageUnitUsers(user, unit.companyId);

    const membership = await this.prisma.membership.findFirst({
      where: {
        userId: targetUserId,
        companyId: unit.companyId,
        status: {
          not: MembershipStatus.REMOVED,
        },
        unitAccess: {
          some: {
            unitId,
          },
        },
      },
    });

    if (!membership) {
      throw new NotFoundException(
        'User is not assigned to this branch or satellite.',
      );
    }

    const companyRoleId = dto.companyRoleId ?? null;

    if (companyRoleId !== null) {
      const role = await this.prisma.companyRole.findFirst({
        where: {
          id: companyRoleId,
          companyId: unit.companyId,
          isActive: true,
        },
        select: {
          roleType: true,
          scopeLevel: true,
        },
      });

      if (!role) {
        throw new BadRequestException(
          'Selected role is not available for this company.',
        );
      }

      if (role.roleType === CompanyRoleType.ADMIN) {
        throw new BadRequestException(
          'Company admin roles cannot be assigned from branch user management.',
        );
      }

      const branchAssignableScopeLevels = new Set<AccessScopeLevel>([
        AccessScopeLevel.COMPANY,
        AccessScopeLevel.BRANCH,
      ]);

      if (!branchAssignableScopeLevels.has(role.scopeLevel)) {
        throw new BadRequestException(
          'Selected role is not available for branch access.',
        );
      }
    }

    const updatedMembership = await this.prisma.membership.update({
      where: {
        userId_companyId: {
          userId: targetUserId,
          companyId: unit.companyId,
        },
      },
      data: {
        companyRoleId,
      },
      include: BranchUserMembershipInclude,
    });

    return mapBranchUser(updatedMembership);
  }

  private async getUnitOrThrow(unitId: number) {
    const unit = await this.prisma.companyUnit.findUnique({
      where: {
        id: unitId,
      },
      select: {
        id: true,
        companyId: true,
        code: true,
        name: true,
        displayName: true,
        type: true,
        isActive: true,
      },
    });

    if (!unit || !unit.isActive) {
      throw new NotFoundException('Branch or satellite not found.');
    }

    return unit;
  }

  private async ensureCanManageUnitUsers(user: AuthUser, companyId: number) {
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
      select: {
        role: true,
        status: true,
      },
    });

    if (
      !membership ||
      membership.status !== MembershipStatus.ACTIVE ||
      membership.role !== MembershipRole.ADMIN
    ) {
      throw new ForbiddenException(
        'Admin access is required to manage branch users.',
      );
    }
  }
}
