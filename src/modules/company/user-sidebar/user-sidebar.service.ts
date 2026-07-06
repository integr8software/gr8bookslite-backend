import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MembershipRole, MembershipStatus, SystemRole } from '@prisma/client';
import { EntitlementService } from '../../../common/access/entitlements/entitlement.service';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { PermissionAction } from '../../../common/enums/permission-action.enum';
import { PrismaService } from '../../../prisma/prisma.service';
import { UserSidebarIconNames } from './user-sidebar.defaults';
import type {
  UserSidebarTreeItemDto,
  SaveUserSidebarDto,
} from './dto/save-user-sidebar.dto';

type UserSidebarScope = {
  companyId: number;
  branchUnitId: number;
  userId: number;
};

type CustomizationTreeItem = UserSidebarTreeItemDto & {
  id: number;
  moduleCode?: string | null;
  permissionCode?: string | null;
  requiredActions?: string[];
  category?: unknown;
  type?: unknown;
  sortOrder: number;
  isHidden?: boolean;
  isPinned?: boolean;
  isCollapsed?: boolean;
  children: CustomizationTreeItem[];
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
    const scope = { companyId, branchUnitId, userId: targetUserId };
    const [defaultItems, preferences] = await Promise.all([
      this.buildDefaultSidebarTree(companyId, permittedModuleIds),
      this.prisma.userSidebarPreference.findMany({
        where: scope,
        orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      }),
    ]);
    const items = this.applyPreferencesToCustomizationTree(
      defaultItems,
      preferences,
    );

    return {
      companyId,
      branchUnitId,
      userId: targetUserId,
      version: this.getPreferenceVersion(preferences),
      items,
      availableModules: [],
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
    }
    const primaryScope = { companyId, branchUnitId, userId: targetUserId };

    await this.prisma.$transaction(async (tx) => {
      const currentPreferences = await tx.userSidebarPreference.findMany({
        where: primaryScope,
        orderBy: { id: 'asc' },
      });
      const currentVersion = this.getPreferenceVersion(currentPreferences);
      if (currentVersion !== dto.version)
        throw new ConflictException(
          'The user module sidebar changed since it was loaded. Refresh and try again.',
        );

      for (const scope of scopes) {
        const permittedModuleIds = await this.getPermittedModuleIds(
          scope.companyId,
          scope.branchUnitId,
          scope.userId,
        );
        const defaultItems = await this.buildDefaultSidebarTree(
          scope.companyId,
          permittedModuleIds,
        );
        const preferences = this.derivePreferenceDeltas(
          defaultItems,
          dto.items,
        );

        await tx.userSidebarPreference.deleteMany({ where: scope });
        if (preferences.length) {
          await tx.userSidebarPreference.createMany({
            data: preferences.map((preference) => ({
              ...scope,
              ...preference,
            })),
          });
        }
      }
      await tx.auditLog.create({
        data: {
          companyId,
          actorUserId: user.id,
          action: 'UPDATE',
          entityType: 'UserSidebarPreference',
          entityId: String(targetUserId),
          metadata: {
            branchUnitId,
            targetUserId,
            applyScope: dto.applyScope ?? 'CURRENT_BRANCH',
            preferenceCount: this.flatten(dto.items).length,
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
    await this.prisma.$transaction(async (tx) => {
      for (const scope of scopes) {
        await tx.userSidebarPreference.deleteMany({ where: scope });
      }
      await tx.auditLog.create({
        data: {
          companyId,
          actorUserId: user.id,
          action: 'RESET',
          entityType: 'UserSidebarPreference',
          entityId: String(targetUserId),
          metadata: { branchUnitId, targetUserId, applyScope },
        },
      });
    });
    return this.getCustomization(user, companyId, branchUnitId, targetUserId);
  }

  private async buildDefaultSidebarTree(
    companyId: number,
    permittedModuleIds: Set<number>,
  ): Promise<CustomizationTreeItem[]> {
    const [modules, sidebarItems] = await Promise.all([
      this.entitlementService.getCompanyAllowedModules(companyId),
      this.entitlementService.getCompanyPlanSidebarItems(
        companyId,
        permittedModuleIds,
      ),
    ]);
    const permittedModules = modules.filter((module) =>
      permittedModuleIds.has(module.id),
    );
    const modulesById = new Map(
      permittedModules.map((module) => [module.id, module]),
    );
    const byParent = new Map<number | null, typeof sidebarItems>();
    const renderedModuleIds = new Set<number>();

    for (const item of sidebarItems) {
      const siblings = byParent.get(item.parentId) ?? [];
      siblings.push(item);
      byParent.set(item.parentId, siblings);
    }

    const visit = (parentId: number | null): CustomizationTreeItem[] =>
      (byParent.get(parentId) ?? []).flatMap(
        (item): CustomizationTreeItem[] => {
          if (item.itemType === 'LINK') {
            if (
              item.moduleId == null ||
              renderedModuleIds.has(item.moduleId) ||
              !modulesById.has(item.moduleId)
            ) {
              return [];
            }

            const module = modulesById.get(item.moduleId)!;
            const permission = module.permissions[0];

            renderedModuleIds.add(item.moduleId);

            return [
              {
                id: -item.id,
                key: `${item.systemCode.toLowerCase()}-${item.key}`,
                label: item.label,
                description: item.description ?? undefined,
                itemType: 'LINK',
                iconName: item.iconName ?? undefined,
                sortOrder: item.sortOrder,
                moduleId: item.moduleId,
                moduleCode: module.code,
                permissionCode: permission?.code,
                requiredActions: permission ? ['view'] : [],
                category: module.category,
                type: module.type,
                isPinned: false,
                isCollapsed: false,
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
              description: item.description ?? undefined,
              itemType: item.itemType,
              iconName: item.iconName ?? undefined,
              sortOrder: item.sortOrder,
              isPinned: false,
              isCollapsed: false,
              children,
            },
          ];
        },
      );

    const systemTree = visit(null);
    const systemModuleIds = new Set(
      this.flattenCustomizationItems(systemTree).flatMap((item) =>
        item.item.moduleId ? [item.item.moduleId] : [],
      ),
    );
    const fallbackItems = permittedModules
      .filter((module) => !systemModuleIds.has(module.id))
      .map((module): CustomizationTreeItem => {
        const permission = module.permissions[0];

        return {
          id: -module.id,
          key: `module-${module.code.toLowerCase()}`,
          label: module.name,
          description: module.description ?? undefined,
          itemType: 'LINK',
          iconName: module.icon ?? undefined,
          sortOrder: Number.MAX_SAFE_INTEGER,
          moduleId: module.id,
          moduleCode: module.code,
          permissionCode: permission?.code,
          requiredActions: permission ? ['view'] : [],
          category: module.category,
          type: module.type,
          isPinned: false,
          isCollapsed: false,
          children: [],
        };
      });

    return [...systemTree, ...fallbackItems];
  }

  private applyPreferencesToCustomizationTree(
    items: CustomizationTreeItem[],
    preferences: Array<{
      itemKey: string;
      isHidden: boolean;
      sortOrder: number | null;
      isPinned: boolean;
      isCollapsed: boolean;
    }>,
  ): CustomizationTreeItem[] {
    const preferencesByKey = new Map(
      preferences.map((preference) => [preference.itemKey, preference]),
    );
    const visit = (
      siblings: CustomizationTreeItem[],
    ): CustomizationTreeItem[] =>
      siblings
        .flatMap((item): CustomizationTreeItem[] => {
          const preference = preferencesByKey.get(item.key);

          if (preference?.isHidden) {
            return [];
          }

          const children = visit(item.children ?? []);

          if (item.itemType !== 'LINK' && children.length === 0) {
            return [];
          }

          return [
            {
              ...item,
              sortOrder: preference?.sortOrder ?? item.sortOrder,
              isPinned: preference?.isPinned ?? false,
              isCollapsed: preference?.isCollapsed ?? false,
              children,
            },
          ];
        })
        .sort(
          (left, right) =>
            left.sortOrder - right.sortOrder ||
            left.label.localeCompare(right.label),
        );

    return visit(items);
  }

  private derivePreferenceDeltas(
    defaultItems: CustomizationTreeItem[],
    submittedItems: UserSidebarTreeItemDto[],
  ) {
    const defaultEntries = this.flattenCustomizationItems(defaultItems);
    const submittedEntries = this.flattenSubmittedItems(submittedItems);
    const defaultByKey = new Map(
      defaultEntries.map((item) => [item.key, item]),
    );
    const submittedByKey = new Map(
      submittedEntries.map((item) => [item.key, item]),
    );
    const preferences: Array<{
      itemKey: string;
      isHidden: boolean;
      sortOrder: number | null;
      isPinned: boolean;
      isCollapsed: boolean;
    }> = [];

    for (const submitted of submittedEntries) {
      const defaultItem = defaultByKey.get(submitted.key);

      if (!defaultItem) {
        throw new BadRequestException(
          `Sidebar item is not part of the plan default: ${submitted.key}`,
        );
      }

      if (submitted.parentKey !== defaultItem.parentKey) {
        throw new BadRequestException(
          'Sidebar items can only be reordered within their default group.',
        );
      }

      const isHidden = submitted.item.isHidden === true;
      const sortOrder =
        submitted.siblingIndex !== defaultItem.siblingIndex
          ? submitted.siblingIndex
          : null;
      const isPinned = submitted.item.isPinned === true;
      const isCollapsed = submitted.item.isCollapsed === true;

      if (isHidden || sortOrder != null || isPinned || isCollapsed) {
        preferences.push({
          itemKey: submitted.key,
          isHidden,
          sortOrder,
          isPinned,
          isCollapsed,
        });
      }
    }

    for (const defaultItem of defaultEntries) {
      if (!submittedByKey.has(defaultItem.key)) {
        preferences.push({
          itemKey: defaultItem.key,
          isHidden: true,
          sortOrder: null,
          isPinned: false,
          isCollapsed: false,
        });
      }
    }

    return preferences;
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

  private flattenCustomizationItems(items: CustomizationTreeItem[]) {
    const entries: Array<{
      key: string;
      parentKey: string | null;
      siblingIndex: number;
      item: CustomizationTreeItem;
    }> = [];
    const visit = (
      siblings: CustomizationTreeItem[],
      parentKey: string | null = null,
    ) => {
      siblings.forEach((item, siblingIndex) => {
        entries.push({ key: item.key, parentKey, siblingIndex, item });
        visit(item.children ?? [], item.key);
      });
    };

    visit(items);
    return entries;
  }

  private flattenSubmittedItems(items: UserSidebarTreeItemDto[]) {
    const entries: Array<{
      key: string;
      parentKey: string | null;
      siblingIndex: number;
      item: UserSidebarTreeItemDto;
    }> = [];
    const visit = (
      siblings: UserSidebarTreeItemDto[],
      parentKey: string | null = null,
    ) => {
      siblings.forEach((item, siblingIndex) => {
        entries.push({ key: item.key, parentKey, siblingIndex, item });
        visit(item.children ?? [], item.key);
      });
    };

    visit(items);
    return entries;
  }

  private getPreferenceVersion(preferences: Array<{ id: number }>) {
    return preferences.reduce(
      (version, preference) => Math.max(version, preference.id),
      0,
    );
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
