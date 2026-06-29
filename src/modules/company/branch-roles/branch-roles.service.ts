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
import { ActivePermissionActions } from '../../../common/constants/active-permission-actions.constant';
import { AppRole } from '../../../common/enums/app-role.enum';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { PrismaService } from '../../../prisma/prisma.service';
import { UserSidebarService } from '../user-sidebar/user-sidebar.service';
import { BranchRolePermissionDto } from './dto/branch-role-permission.dto';
import { CreateBranchRoleDto } from './dto/create-branch-role.dto';
import { UpdateBranchRoleStatusDto } from './dto/update-branch-role-status.dto';
import { UpdateBranchRoleDto } from './dto/update-branch-role.dto';
import { mapBranchRole } from './mappers/branch-role.mapper';
import { BranchRoleInclude } from './prisma/branch-role.include';

type NormalizedBranchRolePermission = {
  moduleCode: string;
  moduleName: string;
  permissionCode: string;
  permissionName: string;
  canView: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canCancel: boolean;
  canUncancel: boolean;
  canExport: boolean;
};

type ResolvedBranchRolePermission = NormalizedBranchRolePermission & {
  permissionId: number;
};

type PermissionCatalogModule = {
  id: number;
  code: string;
  name: string;
  permissions: Array<{ code: string }>;
};

type PermissionCatalogLeaf = {
  code: string;
  name: string;
  permissionCode: string;
  actions: readonly string[];
};

type PermissionCatalogSection = {
  code: string;
  name: string;
  submodules: PermissionCatalogLeaf[];
};

const LegacyPettyCashReplenishmentPermissionCode =
  'cash-disbursement-petty-cash-replenishment';
const LegacyPettyCashFundReplenishmentPermissionCode =
  'cash-disbursement-petty-cash-fund-replenishment';
const PettyCashFundReplenishmentPermissionCode = 'PCFR';
const PettyCashAdvanceReplenishmentPermissionCode = 'PCAR';
const PettyCashAdvancePermissionCode = 'PCA';
const AccountsPayableVoucherPermissionCode = 'APV';
const LegacyPettyCashAdvanceReplenishmentPermissionCode =
  'cash-disbursement-petty-cash-advance-replenishment';
const LegacyPettyCashAdvancePermissionCode =
  'cash-disbursement-petty-cash-advance';
const LegacyAccountsPayableVoucherPermissionCode =
  'accounts-payable-accounts-payable-voucher';

@Injectable()
export class BranchRolesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userSidebarService: UserSidebarService,
  ) {}

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

  async getPermissionCatalog(user: AuthUser, unitId: number) {
    const unit = await this.getUnitOrThrow(unitId);
    await this.ensureCanManageBranchRoles(user, unit.companyId);

    const [modules, sidebarItems] = await Promise.all([
      this.prisma.module.findMany({
        where: {
          isActive: true,
          permissions: {
            some: { isActive: true },
          },
        },
        select: {
          id: true,
          code: true,
          name: true,
          permissions: {
            where: { isActive: true },
            select: { code: true },
            orderBy: [{ name: 'asc' }],
            take: 1,
          },
        },
        orderBy: [{ name: 'asc' }],
      }),
      this.prisma.platformModuleSidebar.findMany({
        where: {
          companyId: unit.companyId,
          branchUnitId: unitId,
          userId: user.id,
        },
        select: {
          id: true,
          parentId: true,
          moduleId: true,
          key: true,
          label: true,
          sortOrder: true,
        },
        orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      }),
    ]);

    const modulesById = new Map<number, PermissionCatalogModule>(
      modules.map((module) => [module.id, module]),
    );
    const sidebarChildren = new Map<number | null, typeof sidebarItems>();
    for (const item of sidebarItems) {
      const siblings = sidebarChildren.get(item.parentId) ?? [];
      siblings.push(item);
      sidebarChildren.set(item.parentId, siblings);
    }
    const assignedModuleIds = new Set<number>();
    const sections: PermissionCatalogSection[] = (
      sidebarChildren.get(null) ?? []
    ).flatMap((section) => {
      const sectionModules: PermissionCatalogLeaf[] = [];
      if (section.moduleId != null) {
        const module = modulesById.get(section.moduleId);
        if (module && !assignedModuleIds.has(module.id)) {
          assignedModuleIds.add(module.id);
          sectionModules.push(this.mapPermissionCatalogModule(module));
        }
      }
      sectionModules.push(
        ...this.collectSidebarModules(
          section.id,
          sidebarChildren,
          modulesById,
          assignedModuleIds,
        ),
      );
      if (!sectionModules.length) return [];

      return [
        {
          code: section.key,
          name: section.label,
          submodules: sectionModules,
        },
      ];
    });
    const ungroupedModules = modules
      .filter((module) => !assignedModuleIds.has(module.id))
      .map((module) => this.mapPermissionCatalogModule(module));

    if (ungroupedModules.length) {
      sections.push({
        code: 'other-modules',
        name: 'Other Modules',
        submodules: ungroupedModules,
      });
    }

    return {
      modules: sections,
    };
  }

  private collectSidebarModules(
    itemId: number,
    sidebarChildren: Map<
      number | null,
      Array<{ id: number; moduleId: number | null }>
    >,
    modulesById: Map<number, PermissionCatalogModule>,
    assignedModuleIds: Set<number>,
  ) {
    const modules: PermissionCatalogLeaf[] = [];
    for (const item of sidebarChildren.get(itemId) ?? []) {
      if (item.moduleId != null) {
        const module = modulesById.get(item.moduleId);
        if (module && !assignedModuleIds.has(module.id)) {
          assignedModuleIds.add(module.id);
          modules.push(this.mapPermissionCatalogModule(module));
        }
      }
      modules.push(
        ...this.collectSidebarModules(
          item.id,
          sidebarChildren,
          modulesById,
          assignedModuleIds,
        ),
      );
    }
    return modules;
  }

  private mapPermissionCatalogModule(module: {
    code: string;
    name: string;
    permissions: Array<{ code: string }>;
  }) {
    return {
      code: module.code,
      name: module.name,
      permissionCode: module.permissions[0].code,
      actions: ActivePermissionActions,
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
    await this.syncAssignedUserSidebars(unit.companyId, unitId, roleId);

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
    await this.syncAssignedUserSidebars(unit.companyId, unitId, roleId);

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
        canCancel: permission.canCancel,
        canUncancel: permission.canUncancel,
        canExport: permission.canExport,
      })),
    });
  }

  private async syncAssignedUserSidebars(
    companyId: number,
    unitId: number,
    companyRoleId: number,
  ) {
    const assignedUsers = await this.prisma.membershipUnitAccess.findMany({
      where: {
        companyId,
        unitId,
        companyRoleId,
      },
      select: {
        userId: true,
      },
    });

    for (const assignedUser of assignedUsers) {
      await this.userSidebarService.syncScopeAfterPermissionChange(
        companyId,
        unitId,
        assignedUser.userId,
      );
    }
  }

  private async resolveRolePermissions(permissions: BranchRolePermissionDto[]) {
    const normalizedPermissions = this.normalizePermissions(permissions);
    const resolvedPermissions: ResolvedBranchRolePermission[] = [];

    for (const permission of normalizedPermissions) {
      const permissionRecord = await this.prisma.permission.findUnique({
        where: {
          code: permission.permissionCode,
        },
        include: {
          module: true,
        },
      });

      const resolvedModule = permissionRecord
        ? getPermissionModule(permissionRecord)
        : null;
      const isCatalogEntryActive =
        permissionRecord?.isActive && resolvedModule?.isActive;

      if (!isCatalogEntryActive) {
        throw new BadRequestException(
          `Unsupported permission code: ${permission.permissionCode}.`,
        );
      }

      resolvedPermissions.push({
        ...permission,
        moduleCode: resolvedModule!.code,
        moduleName: resolvedModule!.name,
        permissionName: permissionRecord.name,
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
      const normalizedPermission =
        this.normalizePermissionCatalogEntry(permission);
      const moduleCode = normalizedPermission.moduleCode?.trim() ?? '';
      const permissionCode = normalizedPermission.permissionCode.trim();

      if (!permissionCode) {
        continue;
      }

      const hasActionAccess = Boolean(
        permission.actions?.some((action) => action !== 'view') ||
        permission.canCreate ||
        permission.canUpdate ||
        permission.canCancel ||
        permission.canUncancel ||
        permission.canExport,
      );
      const actions = new Set(permission.actions ?? []);

      const current = normalizedPermissions.get(permissionCode);
      const nextPermission = {
        moduleCode,
        moduleName: normalizedPermission.moduleName?.trim() ?? '',
        permissionCode,
        permissionName: normalizedPermission.permissionName?.trim() ?? '',
        canView: Boolean(
          actions.has('view') || permission.canView || hasActionAccess,
        ),
        canCreate: Boolean(actions.has('create') || permission.canCreate),
        canUpdate: Boolean(actions.has('update') || permission.canUpdate),
        canCancel: Boolean(actions.has('cancel') || permission.canCancel),
        canUncancel: Boolean(actions.has('uncancel') || permission.canUncancel),
        canExport: Boolean(actions.has('export') || permission.canExport),
      };

      normalizedPermissions.set(permissionCode, {
        ...nextPermission,
        moduleCode: nextPermission.moduleCode || current?.moduleCode || '',
        moduleName: nextPermission.moduleName || current?.moduleName || '',
        permissionName:
          nextPermission.permissionName || current?.permissionName || '',
        canView: Boolean(current?.canView || nextPermission.canView),
        canCreate: Boolean(current?.canCreate || nextPermission.canCreate),
        canUpdate: Boolean(current?.canUpdate || nextPermission.canUpdate),
        canCancel: Boolean(current?.canCancel || nextPermission.canCancel),
        canUncancel: Boolean(
          current?.canUncancel || nextPermission.canUncancel,
        ),
        canExport: Boolean(current?.canExport || nextPermission.canExport),
      });
    }

    return [...normalizedPermissions.values()];
  }

  private normalizePermissionCatalogEntry(permission: BranchRolePermissionDto) {
    const permissionCode = permission.permissionCode.trim();
    let canonicalPermission: {
      code: string;
      name: string;
      moduleCode: string;
      moduleName: string;
    } | null = null;

    if (
      permissionCode === LegacyPettyCashReplenishmentPermissionCode ||
      permissionCode === LegacyPettyCashFundReplenishmentPermissionCode ||
      permissionCode === PettyCashFundReplenishmentPermissionCode
    ) {
      canonicalPermission = {
        code: PettyCashFundReplenishmentPermissionCode,
        name: 'Petty Cash Fund Replenishment',
        moduleCode: PettyCashAdvancePermissionCode,
        moduleName: 'Cash Disbursement',
      };
    } else if (
      permissionCode === LegacyPettyCashAdvanceReplenishmentPermissionCode ||
      permissionCode === PettyCashAdvanceReplenishmentPermissionCode
    ) {
      canonicalPermission = {
        code: PettyCashAdvanceReplenishmentPermissionCode,
        name: 'Petty Cash Advance Replenishment',
        moduleCode: PettyCashAdvanceReplenishmentPermissionCode,
        moduleName: 'Cash Disbursement',
      };
    } else if (
      permissionCode === LegacyPettyCashAdvancePermissionCode ||
      permissionCode === PettyCashAdvancePermissionCode
    ) {
      canonicalPermission = {
        code: PettyCashAdvancePermissionCode,
        name: 'Petty Cash Advance',
        moduleCode: PettyCashFundReplenishmentPermissionCode,
        moduleName: 'Cash Disbursement',
      };
    } else if (
      permissionCode === LegacyAccountsPayableVoucherPermissionCode ||
      permissionCode === AccountsPayableVoucherPermissionCode
    ) {
      canonicalPermission = {
        code: AccountsPayableVoucherPermissionCode,
        name: 'Accounts Payable Voucher',
        moduleCode: AccountsPayableVoucherPermissionCode,
        moduleName: 'Accounts Payable',
      };
    }

    if (!canonicalPermission) {
      return permission;
    }

    return {
      ...permission,
      moduleCode: canonicalPermission.moduleCode,
      moduleName: canonicalPermission.moduleName,
      permissionCode: canonicalPermission.code,
      permissionName: canonicalPermission.name,
    };
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

function getPermissionModule(permission: {
  module?: { code: string; name: string; isActive: boolean } | null;
}) {
  const legacy = permission as typeof permission & {
    submodule?: {
      isActive: boolean;
      module: { code: string; name: string; isActive: boolean };
    } | null;
  };
  if (permission.module) return permission.module;
  return legacy.submodule?.isActive ? legacy.submodule.module : null;
}
