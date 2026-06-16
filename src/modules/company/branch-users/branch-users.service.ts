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
import { mapBranchUser, mapBranchUserRole } from './mappers/branch-user.mapper';
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
        role: MembershipRole.USER,
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
        displayName: unit.name,
        type: unit.type,
      },
      users: memberships.map((membership) => mapBranchUser(membership, unitId)),
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
        scopeLevel: AccessScopeLevel.BRANCH,
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
        role: MembershipRole.USER,
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

      if (role.scopeLevel !== AccessScopeLevel.BRANCH) {
        throw new BadRequestException(
          'Selected role is not available for branch access.',
        );
      }
    }

    await this.prisma.membershipUnitAccess.update({
      where: {
        userId_companyId_unitId: {
          userId: targetUserId,
          companyId: unit.companyId,
          unitId,
        },
      },
      data: {
        companyRoleId,
      },
    });

    const updatedMembership = await this.prisma.membership.findUniqueOrThrow({
      where: {
        userId_companyId: {
          userId: targetUserId,
          companyId: unit.companyId,
        },
      },
      include: BranchUserMembershipInclude,
    });

    return mapBranchUser(updatedMembership, unitId);
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

    if (
      user.companyId === companyId &&
      user.membershipStatus === MembershipStatus.ACTIVE &&
      user.membershipRole === MembershipRole.ADMIN
    ) {
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
