import { Injectable } from '@nestjs/common';
import { MembershipRole } from '@prisma/client';
import { EntitlementService } from '../entitlements/entitlement.service';
import type { AuthUserModuleItem } from '../../interfaces/auth-user.interface';
import type {
  SidebarEnabledModule,
  SidebarEntitledModule,
  SidebarMembershipSource,
  SidebarPreferenceRow,
  SidebarSystemTemplateRow,
  SidebarUserModules,
} from './sidebar-builder.types';

@Injectable()
export class SidebarBuilder {
  constructor(private readonly entitlementService: EntitlementService) {}

  buildUserModules(membership: SidebarMembershipSource, permissions: string[]): SidebarUserModules {
    const permissionSet = new Set(permissions);
    const hasAdminModuleAccess = membership.role === MembershipRole.ADMIN;
    const enabledModules = this.entitlementService.getEnabledModules(membership);
    const permittedEnabledModules = this.entitlementService.getPermittedEnabledModules(
      enabledModules,
      permissionSet,
      hasAdminModuleAccess,
    );
    const fallbackItems = permittedEnabledModules.map((item) => this.buildFallbackUserModuleItem(item.module));
    const branchIds = this.getAccessibleBranchIds(membership);
    const systemSidebarItems = this.getActiveSystemSidebarItems(membership);
    const byBranch = branchIds.map((branchUnitId) => this.buildBranchModuleAccess(membership, branchUnitId, permittedEnabledModules, systemSidebarItems));

    return { items: byBranch[0]?.items ?? fallbackItems, byBranch };
  }



  private getAccessibleBranchIds(membership: SidebarMembershipSource): number[] {
    const defaultBranchIds =
      membership.role === MembershipRole.ADMIN || membership.accessScope === 'COMPANY' || membership.unitAccess.length === 0
        ? membership.company.units.map((item) => item.id)
        : membership.unitAccess.map((item) => item.unitId);

    return Array.from(
      new Set([
        ...defaultBranchIds,
        ...membership.unitAccess.map((item) => item.unitId),
        ...membership.company.sidebarPreferences.map((item) => item.branchUnitId),
      ]),
    );
  }

  private buildBranchModuleAccess(
    membership: SidebarMembershipSource,
    branchUnitId: number,
    permittedEnabledModules: SidebarEntitledModule[],
    systemSidebarItems: SidebarSystemTemplateRow[],
  ) {
    const branchAccess = membership.unitAccess.find((item) => item.unitId === branchUnitId);

    return {
      branchUnitId,
      companyRoleId: branchAccess?.companyRole?.id ?? null,
      companyRoleCode: branchAccess?.companyRole?.code ?? null,
      companyRoleName: branchAccess?.companyRole?.name ?? null,
      items: this.buildBranchUserModules({
        preferences: membership.company.sidebarPreferences.filter((item) => item.branchUnitId === branchUnitId),
        enabledModules: permittedEnabledModules,
        systemSidebarItems,
      }),
    };
  }

  private getActiveSystemSidebarItems(membership: SidebarMembershipSource): SidebarSystemTemplateRow[] {
    const subscription = membership.company.subscriptions[0];

    if (!subscription) {
      return [];
    }

    return subscription.plan.systems.flatMap((planSystem) =>
      planSystem.system.sidebarItems.map((item) => ({
        ...item,
        systemCode: planSystem.system.code,
      })),
    );
  }

  private buildBranchUserModules({
    preferences,
    enabledModules,
    systemSidebarItems,
  }: {
    preferences: SidebarPreferenceRow[];
    enabledModules: SidebarEntitledModule[];
    systemSidebarItems: SidebarSystemTemplateRow[];
  }) {
    const systemTree = this.buildSystemSidebarTree(systemSidebarItems, enabledModules);
    const systemModuleIds = this.collectModuleIds(systemTree);

    const defaultTree = [...systemTree, ...this.buildMissingFallbackItems(enabledModules, systemModuleIds)];

    return this.applyPreferences(defaultTree, preferences);
  }

  private buildMissingFallbackItems(enabledModules: SidebarEntitledModule[], existingModuleIds: Set<number>) {
    return enabledModules.filter((item) => !existingModuleIds.has(item.moduleId)).map((item) => this.buildFallbackUserModuleItem(item.module));
  }

  private collectModuleIds(items: AuthUserModuleItem[]) {
    const moduleIds = new Set<number>();
    const visit = (item: AuthUserModuleItem) => {
      if (item.moduleId != null) {
        moduleIds.add(item.moduleId);
      }
      item.children.forEach(visit);
    };
    items.forEach(visit);
    return moduleIds;
  }

  private buildFallbackUserModuleItem(module: SidebarEnabledModule): AuthUserModuleItem {
    const permission = module.permissions[0];
    const routeKey = `module-${module.code.toLowerCase()}`;

    return {
      id: -module.id,
      key: routeKey || module.code.toLowerCase(),
      label: module.name,
      description: module.description,
      itemType: 'LINK',
      iconName: module.icon,
      sortOrder: Number.MAX_SAFE_INTEGER,
      moduleId: module.id,
      moduleCode: module.code,
      permissionCode: permission?.code ?? null,
      requiredActions: permission ? ['view'] : [],
      category: module.category,
      isPinned: false,
      isCollapsed: false,
      children: [],
    };
  }

  private buildSystemSidebarTree(items: SidebarSystemTemplateRow[], enabledModules: SidebarEntitledModule[]) {
    const enabledModulesById = new Map(enabledModules.map((item) => [item.moduleId, item.module]));
    const byParent = new Map<number | null, SidebarSystemTemplateRow[]>();
    const renderedModuleIds = new Set<number>();

    for (const item of items) {
      const siblings = byParent.get(item.parentId) ?? [];
      siblings.push(item);
      byParent.set(item.parentId, siblings);
    }

    const visit = (parentId: number | null): AuthUserModuleItem[] =>
      (byParent.get(parentId) ?? []).flatMap((item): AuthUserModuleItem[] => {
        if (item.itemType === 'LINK') {
          if (item.moduleId == null || renderedModuleIds.has(item.moduleId) || !enabledModulesById.has(item.moduleId)) {
            return [];
          }

          const module = enabledModulesById.get(item.moduleId)!;
          const permission = module.permissions[0];

          renderedModuleIds.add(item.moduleId);

          return [
            {
              id: -item.id,
              key: `${item.systemCode.toLowerCase()}-${item.key}`,
              label: item.label,
              description: item.description,
              itemType: 'LINK',
              iconName: item.iconName,
              sortOrder: item.sortOrder,
              moduleId: item.moduleId,
              moduleCode: module.code,
              permissionCode: permission?.code ?? null,
              requiredActions: permission ? ['view'] : [],
              category: module.category,
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
            description: item.description,
            itemType: item.itemType,
            iconName: item.iconName,
            sortOrder: item.sortOrder,
            moduleId: null,
            moduleCode: null,
            permissionCode: null,
            requiredActions: [],
            category: null,
            isPinned: false,
            isCollapsed: false,
            children,
          },
        ];
      });

    return visit(null);
  }

  private applyPreferences(items: AuthUserModuleItem[], preferences: SidebarPreferenceRow[]): AuthUserModuleItem[] {
    if (preferences.length === 0) {
      return items;
    }

    const preferencesByKey = new Map(preferences.map((preference) => [preference.itemKey, preference]));
    const defaultEntries = this.flattenUserModuleItems(items);
    const entriesByKey = new Map(defaultEntries.map((entry) => [entry.item.key, entry]));
    const visibleItemsByKey = new Map<string, AuthUserModuleItem>();

    for (const entry of defaultEntries) {
      const preference = preferencesByKey.get(entry.item.key);

      if (preference?.isHidden) {
        continue;
      }

      visibleItemsByKey.set(entry.item.key, {
        ...entry.item,
        sortOrder: preference?.sortOrder ?? entry.item.sortOrder,
        isPinned: preference?.isPinned ?? false,
        isCollapsed: preference?.isCollapsed ?? false,
        children: [],
      });
    }

    const roots: AuthUserModuleItem[] = [];

    for (const entry of defaultEntries) {
      const item = visibleItemsByKey.get(entry.item.key);

      if (!item) {
        continue;
      }

      const parentKey = this.resolvePreferenceParentKey({
        entry,
        preference: preferencesByKey.get(entry.item.key),
        entriesByKey,
        visibleItemsByKey,
      });

      if (!parentKey) {
        roots.push(item);
        continue;
      }

      const parent = visibleItemsByKey.get(parentKey);

      if (parent && parent.itemType !== 'LINK') {
        parent.children.push(item);
      }
    }

    return this.pruneAndSortSidebarItems(roots);
  }

  private resolvePreferenceParentKey({
    entry,
    preference,
    entriesByKey,
    visibleItemsByKey,
  }: {
    entry: {
      item: AuthUserModuleItem;
      parentKey: string | null;
      depth: number;
      subtreeDepth: number;
    };
    preference: SidebarPreferenceRow | undefined;
    entriesByKey: Map<
      string,
      {
        item: AuthUserModuleItem;
        parentKey: string | null;
        depth: number;
        subtreeDepth: number;
      }
    >;
    visibleItemsByKey: Map<string, AuthUserModuleItem>;
  }) {
    if (!preference?.hasParentOverride) {
      return entry.parentKey;
    }

    const requestedParentKey = preference.parentItemKey;

    if (requestedParentKey == null) {
      return null;
    }

    const requestedParent = entriesByKey.get(requestedParentKey);

    if (
      !requestedParent ||
      requestedParent.item.itemType === 'LINK' ||
      !visibleItemsByKey.has(requestedParentKey) ||
      this.isDescendantKey(requestedParentKey, entry.item.key, entriesByKey) ||
      requestedParent.depth + entry.subtreeDepth > 3
    ) {
      return entry.parentKey;
    }

    return requestedParentKey;
  }

  private pruneAndSortSidebarItems(items: AuthUserModuleItem[]): AuthUserModuleItem[] {
    return items
      .flatMap((item): AuthUserModuleItem[] => {
        const children = this.pruneAndSortSidebarItems(item.children);

        if (item.itemType !== 'LINK' && children.length === 0) {
          return [];
        }

        return [{ ...item, children }];
      })
      .sort((left, right) => left.sortOrder - right.sortOrder || left.label.localeCompare(right.label));
  }

  private flattenUserModuleItems(items: AuthUserModuleItem[]) {
    const entries: Array<{
      item: AuthUserModuleItem;
      parentKey: string | null;
      depth: number;
      subtreeDepth: number;
    }> = [];
    const visit = (siblings: AuthUserModuleItem[], parentKey: string | null = null, depth = 1) => {
      siblings.forEach((item) => {
        entries.push({
          item,
          parentKey,
          depth,
          subtreeDepth: this.getSubtreeDepth(item),
        });
        visit(item.children, item.key, depth + 1);
      });
    };

    visit(items);
    return entries;
  }

  private getSubtreeDepth(item: AuthUserModuleItem): number {
    return item.children.length ? 1 + Math.max(...item.children.map((child) => this.getSubtreeDepth(child))) : 1;
  }

  private isDescendantKey(candidateKey: string, ancestorKey: string, entriesByKey: Map<string, { parentKey: string | null }>) {
    let current = entriesByKey.get(candidateKey)?.parentKey ?? null;

    while (current) {
      if (current === ancestorKey) {
        return true;
      }

      current = entriesByKey.get(current)?.parentKey ?? null;
    }

    return false;
  }
}
