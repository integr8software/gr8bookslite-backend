import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  MembershipRole,
  MembershipStatus,
  Prisma,
  SystemRole,
} from '@prisma/client';
import { EntitlementService } from '../../../common/access/entitlements/entitlement.service';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { PermissionAction } from '../../../common/enums/permission-action.enum';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  UserSidebarIconNames,
  materializeDefaultUserSidebar,
} from './user-sidebar.defaults';
import type {
  UserSidebarTreeItemDto,
  SaveUserSidebarDto,
} from './dto/save-user-sidebar.dto';

const userSidebarInclude = {
  module: {
    include: {
      permissions: {
        where: { isActive: true },
        orderBy: { id: 'asc' as const },
      },
    },
  },
} satisfies Prisma.PlatformModuleSidebarInclude;

type UserSidebarRecord = Prisma.PlatformModuleSidebarGetPayload<{
  include: typeof userSidebarInclude;
}>;

type UserSidebarScope = {
  companyId: number;
  branchUnitId: number;
  userId: number;
};

@Injectable()
export class UserSidebarService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly entitlementService: EntitlementService,
  ) {}

  async getCustomization(
    user: AuthUser,
    companyId: number,
    branchUnitId: number,
    targetUserId = user.id,
  ) {
    await this.ensureSidebarAccess(user, companyId, targetUserId);
    await this.ensureScope(companyId, branchUnitId, targetUserId);
    const permittedModuleIds = await this.getPermittedModuleIds(
      companyId,
      branchUnitId,
      targetUserId,
    );
    await this.materializeScopeIfMissing(
      { companyId, branchUnitId, userId: targetUserId },
      permittedModuleIds,
    );

    const scope = { companyId, branchUnitId, userId: targetUserId };
    const [items, available] = await Promise.all([
      this.prisma.platformModuleSidebar.findMany({
        where: scope,
        include: userSidebarInclude,
        orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      }),
      this.prisma.module.findMany({
        where: {
          id: { in: Array.from(permittedModuleIds) },
          isActive: true,
          moduleSidebar: { none: scope },
        },
        include: {
          permissions: { where: { isActive: true }, orderBy: { id: 'asc' } },
        },
        orderBy: { name: 'asc' },
      }),
    ]);

    return {
      companyId,
      branchUnitId,
      userId: targetUserId,
      version: items.reduce(
        (version, item) => Math.max(version, item.version),
        0,
      ),
      items: this.buildTree(items, false),
      availableModules: available.map((module) => ({
        id: module.id,
        code: module.code,
        name: module.name,
        description: module.description,
        category: module.category,
        type: module.type,
        iconName: module.icon,
        permissionCode: module.permissions[0]?.code,
      })),
      supportedIconNames: UserSidebarIconNames,
    };
  }

  async save(
    user: AuthUser,
    companyId: number,
    branchUnitId: number,
    targetUserId: number,
    dto: SaveUserSidebarDto,
  ) {
    const access = await this.ensureSidebarAccess(
      user,
      companyId,
      targetUserId,
    );
    await this.ensureScope(companyId, branchUnitId, targetUserId);
    if (dto.applyScope === 'ALL_BRANCHES' && !access.canManageOthers) {
      throw new ForbiddenException(
        'Company administrator access is required to apply sidebar changes to all branches.',
      );
    }
    this.validateTree(dto.items);
    if (!dto.items.length)
      throw new BadRequestException(
        'A user module sidebar must contain at least one root item.',
      );
    const moduleIds = this.flatten(dto.items).flatMap((item) =>
      item.moduleId ? [item.moduleId] : [],
    );
    const scopes =
      dto.applyScope === 'ALL_BRANCHES'
        ? await this.getAdminBranchScopes(companyId, targetUserId)
        : [{ companyId, branchUnitId, userId: targetUserId }];
    for (const scope of scopes) {
      const permittedModuleIds = await this.getPermittedModuleIds(
        companyId,
        scope.branchUnitId,
        targetUserId,
      );
      if (moduleIds.some((moduleId) => !permittedModuleIds.has(moduleId))) {
        throw new BadRequestException(
          'Every link must reference a module the target user can view in the selected branch scope.',
        );
      }
      if (
        permittedModuleIds.size !== moduleIds.length ||
        Array.from(permittedModuleIds).some(
          (moduleId) => !moduleIds.includes(moduleId),
        )
      ) {
        throw new BadRequestException(
          'Every permitted module must be included in the user sidebar.',
        );
      }
    }
    const primaryScope = { companyId, branchUnitId, userId: targetUserId };

    await this.prisma.$transaction(async (tx) => {
      const current = await tx.platformModuleSidebar.aggregate({
        where: primaryScope,
        _max: { version: true },
      });
      const currentVersion = current._max.version ?? 0;
      if (currentVersion !== dto.version)
        throw new ConflictException(
          'The user module sidebar changed since it was loaded. Refresh and try again.',
        );
      const nextVersion = currentVersion + 1;

      for (const scope of scopes) {
        await tx.platformModuleSidebar.deleteMany({ where: scope });
        await this.createItems(tx, scope, dto.items, null, nextVersion);
      }
      await tx.auditLog.create({
        data: {
          companyId,
          actorUserId: user.id,
          action: 'UPDATE',
          entityType: 'PlatformModuleSidebar',
          entityId: String(targetUserId),
          metadata: {
            branchUnitId,
            targetUserId,
            applyScope: dto.applyScope ?? 'CURRENT_BRANCH',
            version: nextVersion,
          },
        },
      });
    });
    return this.getCustomization(user, companyId, branchUnitId, targetUserId);
  }

  async reset(
    user: AuthUser,
    companyId: number,
    branchUnitId: number,
    targetUserId = user.id,
    applyScope: 'CURRENT_BRANCH' | 'ALL_BRANCHES' = 'CURRENT_BRANCH',
  ) {
    const access = await this.ensureSidebarAccess(
      user,
      companyId,
      targetUserId,
    );
    await this.ensureScope(companyId, branchUnitId, targetUserId);
    if (applyScope === 'ALL_BRANCHES' && !access.canManageOthers) {
      throw new ForbiddenException(
        'Company administrator access is required to reset sidebar changes for all branches.',
      );
    }
    const scopes =
      applyScope === 'ALL_BRANCHES'
        ? await this.getAdminBranchScopes(companyId, targetUserId)
        : [{ companyId, branchUnitId, userId: targetUserId }];
    const permittedByBranch = new Map<number, Set<number>>();
    for (const scope of scopes) {
      permittedByBranch.set(
        scope.branchUnitId,
        await this.getPermittedModuleIds(
          scope.companyId,
          scope.branchUnitId,
          scope.userId,
        ),
      );
    }

    await this.prisma.$transaction(async (tx) => {
      for (const scope of scopes) {
        const current = await tx.platformModuleSidebar.aggregate({
          where: scope,
          _max: { version: true },
        });
        const permittedModuleIds =
          permittedByBranch.get(scope.branchUnitId) ?? new Set<number>();
        await tx.platformModuleSidebar.deleteMany({ where: scope });
        await this.materializeFromAdminSidebarTemplate(
          tx,
          scope,
          permittedModuleIds,
        );
        await materializeDefaultUserSidebar(
          tx,
          scope.companyId,
          scope.branchUnitId,
          scope.userId,
          { moduleIds: permittedModuleIds },
        );
        await tx.platformModuleSidebar.updateMany({
          where: scope,
          data: { version: (current._max.version ?? 0) + 1 },
        });
      }
      await tx.auditLog.create({
        data: {
          companyId,
          actorUserId: user.id,
          action: 'RESET',
          entityType: 'PlatformModuleSidebar',
          entityId: String(targetUserId),
          metadata: { branchUnitId, targetUserId, applyScope },
        },
      });
    });
    return this.getCustomization(user, companyId, branchUnitId, targetUserId);
  }

  async syncScopeAfterPermissionChange(
    companyId: number,
    branchUnitId: number,
    targetUserId: number,
  ) {
    await this.ensureScope(companyId, branchUnitId, targetUserId);
    const permittedModuleIds = await this.getPermittedModuleIds(
      companyId,
      branchUnitId,
      targetUserId,
    );

    await this.materializeScopeIfMissing(
      { companyId, branchUnitId, userId: targetUserId },
      permittedModuleIds,
    );
  }

  private buildTree(items: UserSidebarRecord[], pruneEmpty: boolean) {
    const byParent = new Map<number | null, UserSidebarRecord[]>();
    for (const item of items) {
      const siblings = byParent.get(item.parentId) ?? [];
      siblings.push(item);
      byParent.set(item.parentId, siblings);
    }
    const visit = (parentId: number | null): Record<string, unknown>[] =>
      (byParent.get(parentId) ?? []).flatMap((item) => {
        const children = visit(item.id);
        if (pruneEmpty && item.itemType !== 'LINK' && !children.length)
          return [];
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
            moduleCode: item.module?.code,
            permissionCode: permission?.code,
            requiredActions: permission ? ['view'] : [],
            category: item.module?.category,
            type: item.module?.type,
            children,
          },
        ];
      });
    return visit(null);
  }

  private validateTree(items: UserSidebarTreeItemDto[]) {
    const keys = new Set<string>();
    const modules = new Set<number>();
    const icons = new Set<string>(UserSidebarIconNames);
    const walk = (siblings: UserSidebarTreeItemDto[], depth: number) =>
      siblings.forEach((item) => {
        item.children ??= [];
        if (!item.key.trim() || keys.has(item.key))
          throw new BadRequestException(
            `Duplicate or empty sidebar key: ${item.key}`,
          );
        keys.add(item.key);
        if (item.iconName && !icons.has(item.iconName))
          throw new BadRequestException(`Unsupported icon: ${item.iconName}`);
        if (depth > 3 || (depth === 3 && item.itemType !== 'LINK'))
          throw new BadRequestException(
            'The sidebar supports at most three levels and level 3 must be a link.',
          );
        if (item.itemType === 'SECTION' && depth > 2)
          throw new BadRequestException(
            'Sections are allowed only at levels 1 and 2.',
          );
        if (item.itemType === 'CONTAINER' && depth > 2)
          throw new BadRequestException(
            'Containers are allowed only at levels 1 and 2.',
          );
        if (item.itemType === 'LINK') {
          if (!item.moduleId || item.children.length)
            throw new BadRequestException(
              'Links require one module and cannot have children.',
            );
          if (modules.has(item.moduleId))
            throw new BadRequestException(
              `Module ${item.moduleId} appears more than once.`,
            );
          modules.add(item.moduleId);
        } else if (item.moduleId)
          throw new BadRequestException(
            'Sections and containers cannot reference a module.',
          );
        walk(item.children, depth + 1);
      });
    walk(items, 1);
  }

  private flatten(items: UserSidebarTreeItemDto[]): UserSidebarTreeItemDto[] {
    return items.flatMap((item) => [
      item,
      ...this.flatten(item.children ?? []),
    ]);
  }

  private async createItems(
    tx: Prisma.TransactionClient,
    scope: UserSidebarScope,
    items: UserSidebarTreeItemDto[],
    parentId: number | null,
    version: number,
  ) {
    for (const [sortOrder, item] of items.entries()) {
      const created = await tx.platformModuleSidebar.create({
        data: {
          ...scope,
          parentId,
          moduleId: item.itemType === 'LINK' ? item.moduleId : null,
          itemType: item.itemType,
          key: item.key,
          label: item.label.trim(),
          description: item.description?.trim() || null,
          iconName: item.iconName || null,
          sortOrder,
          version,
        },
      });
      await this.createItems(
        tx,
        scope,
        item.children ?? [],
        created.id,
        version,
      );
    }
  }

  private async materializeScopeIfMissing(
    scope: UserSidebarScope,
    permittedModuleIds: Set<number>,
  ) {
    await this.prisma.$transaction(async (tx) => {
      await tx.platformModuleSidebar.deleteMany({
        where: {
          ...scope,
          itemType: 'LINK',
          OR: [
            { moduleId: null },
            { moduleId: { notIn: Array.from(permittedModuleIds) } },
          ],
        },
      });
      await this.pruneEmptyContainers(tx, scope);
      const existingItems = await tx.platformModuleSidebar.count({
        where: scope,
      });
      if (!existingItems) {
        await this.materializeFromAdminSidebarTemplate(
          tx,
          scope,
          permittedModuleIds,
        );
      }
      await materializeDefaultUserSidebar(
        tx,
        scope.companyId,
        scope.branchUnitId,
        scope.userId,
        { moduleIds: permittedModuleIds },
      );
      await this.pruneEmptyContainers(tx, scope);
    });
  }

  private async materializeFromAdminSidebarTemplate(
    tx: Prisma.TransactionClient,
    scope: UserSidebarScope,
    permittedModuleIds: Set<number>,
  ) {
    const adminMembership = await tx.membership.findFirst({
      where: {
        companyId: scope.companyId,
        role: MembershipRole.ADMIN,
        status: MembershipStatus.ACTIVE,
        userId: { not: scope.userId },
        user: {
          moduleSidebar: {
            some: {
              companyId: scope.companyId,
              branchUnitId: scope.branchUnitId,
            },
          },
        },
      },
      select: { userId: true },
      orderBy: { userId: 'asc' },
    });

    if (!adminMembership) return;

    const templateItems = await tx.platformModuleSidebar.findMany({
      where: {
        companyId: scope.companyId,
        branchUnitId: scope.branchUnitId,
        userId: adminMembership.userId,
      },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
    const childrenByParent = new Map<number | null, typeof templateItems>();
    for (const item of templateItems) {
      const siblings = childrenByParent.get(item.parentId) ?? [];
      siblings.push(item);
      childrenByParent.set(item.parentId, siblings);
    }

    const hasPermittedLink = (itemId: number): boolean =>
      (childrenByParent.get(itemId) ?? []).some((item) =>
        item.itemType === 'LINK'
          ? Boolean(item.moduleId && permittedModuleIds.has(item.moduleId))
          : hasPermittedLink(item.id),
      );

    const copyChildren = async (
      templateParentId: number | null,
      targetParentId: number | null,
    ) => {
      for (const [sortOrder, item] of (
        childrenByParent.get(templateParentId) ?? []
      ).entries()) {
        if (item.itemType === 'LINK') {
          if (!item.moduleId || !permittedModuleIds.has(item.moduleId)) {
            continue;
          }
        } else if (!hasPermittedLink(item.id)) {
          continue;
        }

        const created = await tx.platformModuleSidebar.create({
          data: {
            ...scope,
            parentId: targetParentId,
            moduleId: item.itemType === 'LINK' ? item.moduleId : null,
            itemType: item.itemType,
            key: item.key,
            label: item.label,
            description: item.description,
            iconName: item.iconName,
            sortOrder,
            version: 1,
          },
          select: { id: true },
        });

        if (item.itemType !== 'LINK') {
          await copyChildren(item.id, created.id);
        }
      }
    };

    await copyChildren(null, null);
  }

  private async getAdminBranchScopes(
    companyId: number,
    userId: number,
  ): Promise<UserSidebarScope[]> {
    const units = await this.prisma.companyUnit.findMany({
      where: { companyId, isActive: true },
      select: { id: true },
      orderBy: { id: 'asc' },
    });
    return units.map((unit) => ({ companyId, branchUnitId: unit.id, userId }));
  }

  private async ensureScope(
    companyId: number,
    branchUnitId: number,
    targetUserId: number,
  ) {
    const [unit, membership] = await Promise.all([
      this.prisma.companyUnit.findFirst({
        where: { id: branchUnitId, companyId, isActive: true },
        select: { id: true },
      }),
      this.prisma.membership.findUnique({
        where: { userId_companyId: { userId: targetUserId, companyId } },
        select: { status: true },
      }),
    ]);
    if (!unit)
      throw new NotFoundException('Branch not found for this company.');
    if (!membership || membership.status !== 'ACTIVE')
      throw new NotFoundException('Target user membership not found.');
  }

  private async ensureSidebarAccess(
    user: AuthUser,
    companyId: number,
    targetUserId: number,
  ) {
    if (user.systemRole === SystemRole.SUPER_ADMIN) {
      return { canManageOthers: true };
    }

    if (user.id === targetUserId && user.companyId === companyId) {
      return { canManageOthers: false };
    }

    const membership = await this.prisma.membership.findUnique({
      where: { userId_companyId: { userId: user.id, companyId } },
      select: { role: true, status: true },
    });
    if (!membership)
      throw new NotFoundException('Company membership not found.');
    if (
      membership.status !== 'ACTIVE' ||
      membership.role !== MembershipRole.ADMIN
    )
      throw new ForbiddenException('Company administrator access is required.');

    return { canManageOthers: true };
  }

  private async getPermittedModuleIds(
    companyId: number,
    branchUnitId: number,
    userId: number,
  ): Promise<Set<number>> {
    const membership = await this.prisma.membership.findUnique({
      where: { userId_companyId: { userId, companyId } },
      include: {
        companyRole: {
          include: {
            permissions: {
              where: {
                permission: { isActive: true, module: { isActive: true } },
              },
              include: { permission: true },
            },
          },
        },
        unitAccess: {
          where: { unitId: branchUnitId },
          include: {
            companyRole: {
              include: {
                permissions: {
                  where: {
                    permission: { isActive: true, module: { isActive: true } },
                  },
                  include: { permission: true },
                },
              },
            },
          },
        },
        permissionOverrides: {
          where: { permission: { isActive: true, module: { isActive: true } } },
          include: { permission: true },
        },
      },
    });

    if (!membership || membership.status !== MembershipStatus.ACTIVE) {
      throw new NotFoundException('Target user membership not found.');
    }

    const enabledModuleIds =
      await this.entitlementService.getCompanyAllowedModuleIds(companyId);

    if (membership.role === MembershipRole.ADMIN) {
      return enabledModuleIds;
    }

    const permissionByModule = new Map<number, boolean>();
    const rolePermissions = [
      ...(membership.companyRole?.isActive
        ? membership.companyRole.permissions
        : []),
      ...membership.unitAccess.flatMap((unitAccess) =>
        unitAccess.companyRole?.isActive
          ? unitAccess.companyRole.permissions
          : [],
      ),
    ];

    for (const rolePermission of rolePermissions) {
      if (!enabledModuleIds.has(rolePermission.permission.moduleId)) continue;
      permissionByModule.set(
        rolePermission.permission.moduleId,
        Boolean(permissionByModule.get(rolePermission.permission.moduleId)) ||
          hasAnyRolePermission(rolePermission),
      );
    }

    for (const override of membership.permissionOverrides) {
      if (!enabledModuleIds.has(override.permission.moduleId)) continue;
      if (!hasAnyOverrideValue(override)) continue;
      permissionByModule.set(
        override.permission.moduleId,
        hasAnyOverridePermission(override),
      );
    }

    return new Set(
      Array.from(permissionByModule.entries())
        .filter(([, hasPermission]) => hasPermission)
        .map(([moduleId]) => moduleId),
    );
  }

  private async pruneEmptyContainers(
    tx: Prisma.TransactionClient,
    scope: UserSidebarScope,
  ) {
    let removed = 0;

    do {
      const containers = await tx.platformModuleSidebar.findMany({
        where: { ...scope, itemType: { in: ['SECTION', 'CONTAINER'] } },
        select: { id: true },
      });
      const emptyIds: number[] = [];

      for (const container of containers) {
        const children = await tx.platformModuleSidebar.count({
          where: { ...scope, parentId: container.id },
        });
        if (!children) emptyIds.push(container.id);
      }

      removed = emptyIds.length;
      if (removed) {
        await tx.platformModuleSidebar.deleteMany({
          where: { ...scope, id: { in: emptyIds } },
        });
      }
    } while (removed);
  }
}

type RolePermissionActions = {
  canView: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canCancel: boolean;
  canUncancel: boolean;
  canExport: boolean;
};

type OverridePermissionActions = {
  canView: boolean | null;
  canCreate: boolean | null;
  canUpdate: boolean | null;
  canCancel: boolean | null;
  canUncancel: boolean | null;
  canExport: boolean | null;
};

const PermissionActionFields: Record<
  PermissionAction,
  keyof RolePermissionActions
> = {
  [PermissionAction.VIEW]: 'canView',
  [PermissionAction.CREATE]: 'canCreate',
  [PermissionAction.UPDATE]: 'canUpdate',
  [PermissionAction.CANCEL]: 'canCancel',
  [PermissionAction.UNCANCEL]: 'canUncancel',
  [PermissionAction.EXPORT]: 'canExport',
};

function hasAnyRolePermission(permission: RolePermissionActions) {
  return Object.values(PermissionActionFields).some(
    (field) => permission[field],
  );
}

function hasAnyOverrideValue(permission: OverridePermissionActions) {
  return Object.values(PermissionActionFields).some(
    (field) => permission[field] != null,
  );
}

function hasAnyOverridePermission(permission: OverridePermissionActions) {
  return Object.values(PermissionActionFields).some(
    (field) => permission[field] === true,
  );
}
