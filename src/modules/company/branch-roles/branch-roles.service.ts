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
  Prisma,
} from '@prisma/client';
import { AppRole } from '../../../common/enums/app-role.enum';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { PrismaService } from '../../../prisma/prisma.service';
import { BranchRolePermissionDto } from './dto/branch-role-permission.dto';
import { CreateBranchRoleDto } from './dto/create-branch-role.dto';
import { UpdateBranchRoleStatusDto } from './dto/update-branch-role-status.dto';
import { UpdateBranchRoleDto } from './dto/update-branch-role.dto';
import { mapBranchRole } from './mappers/branch-role.mapper';
import { BranchRoleInclude } from './prisma/branch-role.include';

type NormalizedBranchRolePermission = Required<BranchRolePermissionDto>;

type ResolvedBranchRolePermission = NormalizedBranchRolePermission & {
  permissionId: number;
};

@Injectable()
export class BranchRolesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(user: AuthUser, unitId: number) {
    const unit = await this.getUnitOrThrow(unitId);
    await this.ensureCanManageBranchRoles(user, unit.companyId);

    const roles = await this.prisma.companyRole.findMany({
      where: {
        companyId: unit.companyId,
        roleType: {
          not: CompanyRoleType.ADMIN,
        },
        scopeLevel: AccessScopeLevel.BRANCH,
      },
      include: BranchRoleInclude,
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    });

    return {
      roles: roles.map(mapBranchRole),
    };
  }

  async findOne(user: AuthUser, unitId: number, roleId: number) {
    const unit = await this.getUnitOrThrow(unitId);
    await this.ensureCanManageBranchRoles(user, unit.companyId);

    const role = await this.getRoleOrThrow(unit.companyId, roleId);

    return {
      role: mapBranchRole(role),
    };
  }

  async create(user: AuthUser, unitId: number, dto: CreateBranchRoleDto) {
    const unit = await this.getUnitOrThrow(unitId);
    await this.ensureCanManageBranchRoles(user, unit.companyId);

    const code = this.normalizeRoleCode(dto.name);
    this.ensureRoleCodeIsUsable(code);
    await this.ensureRoleCodeAvailable(unit.companyId, code);
    const rolePermissions = await this.resolveRolePermissions(dto.permissions);

    const role = await this.prisma.$transaction(async (tx) => {
      const createdRole = await tx.companyRole.create({
        data: {
          companyId: unit.companyId,
          code,
          name: dto.name.trim(),
          description: dto.description?.trim() || null,
          roleType: CompanyRoleType.CUSTOM,
          scopeLevel: AccessScopeLevel.BRANCH,
          isSystem: false,
          isActive: true,
        },
      });

      await this.replaceRolePermissions(tx, createdRole.id, rolePermissions);

      return tx.companyRole.findUniqueOrThrow({
        where: {
          id: createdRole.id,
        },
        include: BranchRoleInclude,
      });
    });

    return {
      message: 'Branch role created.',
      role: mapBranchRole(role),
    };
  }

  async update(
    user: AuthUser,
    unitId: number,
    roleId: number,
    dto: UpdateBranchRoleDto,
  ) {
    const unit = await this.getUnitOrThrow(unitId);
    await this.ensureCanManageBranchRoles(user, unit.companyId);
    const existingRole = await this.getRoleOrThrow(unit.companyId, roleId);
    this.ensureRoleIsEditable(existingRole);

    const code = this.normalizeRoleCode(dto.name);
    this.ensureRoleCodeIsUsable(code);
    await this.ensureRoleCodeAvailable(unit.companyId, code, roleId);
    const rolePermissions = await this.resolveRolePermissions(dto.permissions);

    const role = await this.prisma.$transaction(async (tx) => {
      await tx.companyRole.update({
        where: {
          id: roleId,
        },
        data: {
          code,
          name: dto.name.trim(),
          description: dto.description?.trim() || null,
        },
      });

      await this.replaceRolePermissions(tx, roleId, rolePermissions);

      return tx.companyRole.findUniqueOrThrow({
        where: {
          id: roleId,
        },
        include: BranchRoleInclude,
      });
    });

    return {
      message: 'Branch role updated.',
      role: mapBranchRole(role),
    };
  }

  async updateStatus(
    user: AuthUser,
    unitId: number,
    roleId: number,
    dto: UpdateBranchRoleStatusDto,
  ) {
    const unit = await this.getUnitOrThrow(unitId);
    await this.ensureCanManageBranchRoles(user, unit.companyId);
    const existingRole = await this.getRoleOrThrow(unit.companyId, roleId);
    this.ensureRoleIsEditable(existingRole);

    const role = await this.prisma.companyRole.update({
      where: {
        id: roleId,
      },
      data: {
        isActive: dto.isActive,
      },
      include: BranchRoleInclude,
    });

    return {
      message: dto.isActive
        ? 'Branch role activated.'
        : 'Branch role deactivated.',
      role: mapBranchRole(role),
    };
  }

  private async replaceRolePermissions(
    tx: Prisma.TransactionClient,
    companyRoleId: number,
    permissions: ResolvedBranchRolePermission[],
  ) {
    await tx.companyRolePermission.deleteMany({
      where: {
        companyRoleId,
      },
    });

    if (permissions.length === 0) {
      return;
    }

    await tx.companyRolePermission.createMany({
      data: permissions.map((permission) => ({
        companyRoleId,
        permissionId: permission.permissionId,
        canView: permission.canView,
        canCreate: permission.canCreate,
        canUpdate: permission.canUpdate,
        canDelete: permission.canDelete,
        canApprove: permission.canApprove,
        canExport: permission.canExport,
      })),
    });
  }

  private async resolveRolePermissions(permissions: BranchRolePermissionDto[]) {
    const normalizedPermissions = this.normalizePermissions(permissions);
    const resolvedPermissions: ResolvedBranchRolePermission[] = [];

    for (const permission of normalizedPermissions) {
      const module = await this.prisma.platformModule.upsert({
        where: {
          code: permission.moduleCode,
        },
        update: {
          name: permission.moduleName,
          isActive: true,
        },
        create: {
          code: permission.moduleCode,
          name: permission.moduleName,
          isActive: true,
        },
      });

      const permissionRecord = await this.prisma.permission.upsert({
        where: {
          code: permission.permissionCode,
        },
        update: {
          moduleId: module.id,
          name: permission.permissionName,
          scopeLevel: AccessScopeLevel.BRANCH,
          isActive: true,
        },
        create: {
          moduleId: module.id,
          code: permission.permissionCode,
          name: permission.permissionName,
          scopeLevel: AccessScopeLevel.BRANCH,
          isActive: true,
        },
      });

      resolvedPermissions.push({
        ...permission,
        permissionId: permissionRecord.id,
      });
    }

    return resolvedPermissions;
  }

  private normalizePermissions(permissions: BranchRolePermissionDto[]) {
    const normalizedPermissions = new Map<
      string,
      NormalizedBranchRolePermission
    >();

    for (const permission of permissions) {
      const moduleCode = permission.moduleCode.trim();
      const permissionCode = permission.permissionCode.trim();

      if (!moduleCode || !permissionCode) {
        continue;
      }

      const hasActionAccess = Boolean(
        permission.canCreate ||
        permission.canUpdate ||
        permission.canDelete ||
        permission.canApprove ||
        permission.canExport,
      );

      normalizedPermissions.set(permissionCode, {
        moduleCode,
        moduleName: permission.moduleName.trim(),
        permissionCode,
        permissionName: permission.permissionName.trim(),
        canView: Boolean(permission.canView || hasActionAccess),
        canCreate: Boolean(permission.canCreate),
        canUpdate: Boolean(permission.canUpdate),
        canDelete: Boolean(permission.canDelete),
        canApprove: Boolean(permission.canApprove),
        canExport: Boolean(permission.canExport),
      });
    }

    return [...normalizedPermissions.values()];
  }

  private normalizeRoleCode(name: string) {
    return name
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '_');
  }

  private async ensureRoleCodeAvailable(
    companyId: number,
    code: string,
    roleId?: number,
  ) {
    const existingRole = await this.prisma.companyRole.findFirst({
      where: {
        companyId,
        code,
        id: roleId ? { not: roleId } : undefined,
      },
      select: {
        id: true,
      },
    });

    if (existingRole) {
      throw new BadRequestException(
        'A branch role with this name already exists.',
      );
    }
  }

  private ensureRoleCodeIsUsable(code: string) {
    if (code.length < 2) {
      throw new BadRequestException(
        'Role name must include at least two letters or numbers.',
      );
    }
  }

  private ensureRoleIsEditable(role: {
    isSystem: boolean;
    roleType: CompanyRoleType;
  }) {
    if (role.isSystem || role.roleType === CompanyRoleType.ADMIN) {
      throw new BadRequestException('This role cannot be edited.');
    }
  }

  private async getRoleOrThrow(companyId: number, roleId: number) {
    const role = await this.prisma.companyRole.findFirst({
      where: {
        id: roleId,
        companyId,
        roleType: {
          not: CompanyRoleType.ADMIN,
        },
        scopeLevel: AccessScopeLevel.BRANCH,
      },
      include: BranchRoleInclude,
    });

    if (!role) {
      throw new NotFoundException('Branch role not found.');
    }

    return role;
  }

  private async getUnitOrThrow(unitId: number) {
    const unit = await this.prisma.companyUnit.findUnique({
      where: {
        id: unitId,
      },
      select: {
        id: true,
        companyId: true,
        isActive: true,
      },
    });

    if (!unit || !unit.isActive) {
      throw new NotFoundException('Branch or satellite not found.');
    }

    return unit;
  }

  private async ensureCanManageBranchRoles(user: AuthUser, companyId: number) {
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
        'Admin access is required to manage branch roles.',
      );
    }
  }
}
