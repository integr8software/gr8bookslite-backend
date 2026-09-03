import { Injectable } from '@nestjs/common';
import { MembershipRole } from '@prisma/client';
import { EntitlementService } from '../entitlements/entitlement.service';
import type { AuthUserModuleItem } from '../../interfaces/auth-user.interface';
import type {
  SidebarEnabledModule,
  SidebarEntitledModule,
  SidebarMembershipSource,
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
    enabledModules,
    systemSidebarItems,
  }: {
    enabledModules: SidebarEntitledModule[];
    systemSidebarItems: SidebarSystemTemplateRow[];
  }) {
    const systemTree = this.buildSystemSidebarTree(systemSidebarItems, enabledModules);
    const systemModuleIds = this.collectModuleIds(systemTree);

    return [...systemTree, ...this.buildMissingFallbackItems(enabledModules, systemModuleIds)];
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
}

