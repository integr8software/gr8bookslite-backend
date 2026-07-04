import { Injectable } from '@nestjs/common';
import { MembershipRole } from '@prisma/client';
import { EntitlementService } from '../entitlements/entitlement.service';
import type { AuthUserModuleItem } from '../../interfaces/auth-user.interface';
import type {
  SidebarEnabledModule,
  SidebarEntitledModule,
  SidebarMembershipSource,
  SidebarSystemTemplateRow,
  SidebarUserModuleRow,
  SidebarUserModules,
} from './sidebar-builder.types';

@Injectable()
export class SidebarBuilder {
  constructor(private readonly entitlementService: EntitlementService) {}

  buildUserModules(
    membership: SidebarMembershipSource,
    permissions: string[],
  ): SidebarUserModules {
    const permissionSet = new Set(permissions);
    const hasAdminModuleAccess = membership.role === MembershipRole.ADMIN;
    const enabledModules =
      this.entitlementService.getEnabledModules(membership);
    const enabledModuleIds =
      this.entitlementService.getEnabledModuleIds(membership);
    const permittedItems = this.getPermittedSidebarItems(
      membership,
      enabledModuleIds,
      permissionSet,
      hasAdminModuleAccess,
    );
    const permittedSidebarModuleIds = new Set(
      permittedItems.flatMap((item) =>
        item.itemType === 'LINK' && item.moduleId ? [item.moduleId] : [],
      ),
    );
    const permittedEnabledModules =
      this.entitlementService.getPermittedEnabledModules(
        enabledModules,
        permissionSet,
        hasAdminModuleAccess,
      );
    const fallbackItems = permittedEnabledModules
      .filter((item) => !permittedSidebarModuleIds.has(item.moduleId))
      .map((item) => this.buildFallbackUserModuleItem(item.module));
    const branchIds = this.getAccessibleBranchIds(membership, permittedItems);
    const systemSidebarItems = this.getActiveSystemSidebarItems(membership);
    const byBranch = branchIds.map((branchUnitId) =>
      this.buildBranchModuleAccess(
        membership,
        branchUnitId,
        permittedItems,
        permittedEnabledModules,
        systemSidebarItems,
      ),
    );

    return { items: byBranch[0]?.items ?? fallbackItems, byBranch };
  }

  private getPermittedSidebarItems(
    membership: SidebarMembershipSource,
    enabledModuleIds: Set<number>,
    permissionSet: Set<string>,
    hasAdminModuleAccess: boolean,
  ): SidebarUserModuleRow[] {
    return membership.company.moduleSidebar.filter((item) =>
      this.isSidebarItemPermitted(
        item,
        enabledModuleIds,
        permissionSet,
        hasAdminModuleAccess,
      ),
    );
  }

  private isSidebarItemPermitted(
    item: SidebarUserModuleRow,
    enabledModuleIds: Set<number>,
    permissionSet: Set<string>,
    hasAdminModuleAccess: boolean,
  ): boolean {
    if (item.itemType !== 'LINK') {
      return true;
    }

    if (!item.module || !item.moduleId || !item.module.isActive) {
      return false;
    }

    if (!enabledModuleIds.has(item.moduleId)) {
      return false;
    }

    return this.entitlementService.hasModulePermission(
      item.module,
      permissionSet,
      hasAdminModuleAccess,
    );
  }

  private getAccessibleBranchIds(
    membership: SidebarMembershipSource,
    permittedItems: SidebarUserModuleRow[],
  ): number[] {
    const defaultBranchIds =
      membership.role === MembershipRole.ADMIN ||
      membership.accessScope === 'COMPANY' ||
      membership.unitAccess.length === 0
        ? membership.company.units.map((item) => item.id)
        : membership.unitAccess.map((item) => item.unitId);

    return Array.from(
      new Set([
        ...defaultBranchIds,
        ...membership.unitAccess.map((item) => item.unitId),
        ...permittedItems.map((item) => item.branchUnitId),
      ]),
    );
  }

  private buildBranchModuleAccess(
    membership: SidebarMembershipSource,
    branchUnitId: number,
    permittedItems: SidebarUserModuleRow[],
    permittedEnabledModules: SidebarEntitledModule[],
    systemSidebarItems: SidebarSystemTemplateRow[],
  ) {
    const branchAccess = membership.unitAccess.find(
      (item) => item.unitId === branchUnitId,
    );

    return {
      branchUnitId,
      companyRoleId: branchAccess?.companyRole?.id ?? null,
      companyRoleCode: branchAccess?.companyRole?.code ?? null,
      companyRoleName: branchAccess?.companyRole?.name ?? null,
      items: this.buildBranchUserModules({
        customItems: permittedItems.filter(
          (item) => item.branchUnitId === branchUnitId,
        ),
        enabledModules: permittedEnabledModules,
        systemSidebarItems,
      }),
    };
  }

  private getActiveSystemSidebarItems(
    membership: SidebarMembershipSource,
  ): SidebarSystemTemplateRow[] {
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
    customItems,
    enabledModules,
    systemSidebarItems,
  }: {
    customItems: SidebarUserModuleRow[];
    enabledModules: SidebarEntitledModule[];
    systemSidebarItems: SidebarSystemTemplateRow[];
  }) {
    if (customItems.length) {
      const customTree = this.buildUserModuleTree(customItems);
      const customModuleIds = this.collectModuleIds(customTree);
      return [
        ...customTree,
        ...this.buildMissingFallbackItems(enabledModules, customModuleIds),
      ];
    }

    const systemTree = this.buildSystemSidebarTree(
      systemSidebarItems,
      enabledModules,
    );
    const systemModuleIds = this.collectModuleIds(systemTree);

    return [
      ...systemTree,
      ...this.buildMissingFallbackItems(enabledModules, systemModuleIds),
    ];
  }

  private buildMissingFallbackItems(
    enabledModules: SidebarEntitledModule[],
    existingModuleIds: Set<number>,
  ) {
    return enabledModules
      .filter((item) => !existingModuleIds.has(item.moduleId))
      .map((item) => this.buildFallbackUserModuleItem(item.module));
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

  private buildFallbackUserModuleItem(
    module: SidebarEnabledModule,
  ): AuthUserModuleItem {
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
      children: [],
    };
  }

  private buildSystemSidebarTree(
    items: SidebarSystemTemplateRow[],
    enabledModules: SidebarEntitledModule[],
  ) {
    const enabledModulesById = new Map(
      enabledModules.map((item) => [item.moduleId, item.module]),
    );
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
          if (
            item.moduleId == null ||
            renderedModuleIds.has(item.moduleId) ||
            !enabledModulesById.has(item.moduleId)
          ) {
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
            children,
          },
        ];
      });

    return visit(null);
  }

  private buildUserModuleTree(items: SidebarUserModuleRow[]) {
    const byParent = new Map<number | null, SidebarUserModuleRow[]>();

    for (const item of items) {
      const siblings = byParent.get(item.parentId) ?? [];
      siblings.push(item);
      byParent.set(item.parentId, siblings);
    }

    const visit = (parentId: number | null): AuthUserModuleItem[] =>
      (byParent.get(parentId) ?? []).flatMap((item) => {
        const children = visit(item.id);

        if (item.itemType !== 'LINK' && !children.length) {
          return [];
        }

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
            moduleCode: item.module?.code ?? null,
            permissionCode: permission?.code ?? null,
            requiredActions: permission ? ['view'] : [],
            category: item.module?.category ?? null,
            children,
          },
        ];
      });

    return visit(null);
  }
}
