import { Injectable } from '@nestjs/common';
import { PermissionAction } from '../../enums/permission-action.enum';
import type {
  CompanyEnabledModulesSource,
  EnabledCompanyModuleRecord,
  EnabledModuleRecord,
} from './entitlement.types';

@Injectable()
export class EntitlementService {
  getEnabledModuleCodes(source: CompanyEnabledModulesSource): string[] {
    return this.getEnabledModules(source).map((item) => item.module.code);
  }

  getEnabledModuleIds(source: CompanyEnabledModulesSource): Set<number> {
    return new Set(this.getEnabledModules(source).map((item) => item.moduleId));
  }

  getEnabledModules<TEnabledModule extends EnabledCompanyModuleRecord>(
    source: CompanyEnabledModulesSource<TEnabledModule>,
  ): TEnabledModule[] {
    const planModules = this.getLatestSubscriptionPlanModules(source);
    const compatibilityModules = source.company.enabledModules.filter((item) =>
      this.isEnabledModuleUsable(item),
    );

    if (planModules.length === 0) {
      return this.dedupeModules(compatibilityModules);
    }

    return this.dedupeModules([...planModules, ...compatibilityModules]);
  }

  getPermittedEnabledModules<TEnabledModule extends EnabledCompanyModuleRecord>(
    enabledModules: TEnabledModule[],
    permissionSet: Set<string>,
    hasAdminModuleAccess: boolean,
  ): TEnabledModule[] {
    return enabledModules.filter((item) =>
      this.hasModulePermission(
        item.module,
        permissionSet,
        hasAdminModuleAccess,
      ),
    );
  }

  hasModulePermission(
    module: EnabledModuleRecord,
    permissionSet: Set<string>,
    hasAdminModuleAccess: boolean,
  ): boolean {
    return (
      hasAdminModuleAccess ||
      module.permissions.some((permission) =>
        Object.values(PermissionAction).some((action) =>
          permissionSet.has(this.buildPermissionKey(permission.code, action)),
        ),
      )
    );
  }

  private buildPermissionKey(
    permissionCode: string,
    action: PermissionAction,
  ): string {
    return `${permissionCode}:${action}`;
  }

  private getLatestSubscriptionPlanModules<
    TEnabledModule extends EnabledCompanyModuleRecord,
  >(source: CompanyEnabledModulesSource<TEnabledModule>): TEnabledModule[] {
    const subscription = source.company.subscriptions?.[0];

    if (!subscription) {
      return [];
    }

    return subscription.plan.systems.flatMap((planSystem) =>
      (planSystem.system.modules ?? []).filter((item) =>
        this.isEnabledModuleUsable(item),
      ),
    );
  }

  private dedupeModules<TEnabledModule extends EnabledCompanyModuleRecord>(
    modules: TEnabledModule[],
  ): TEnabledModule[] {
    const byModuleId = new Map<number, TEnabledModule>();

    for (const module of modules) {
      if (!byModuleId.has(module.moduleId)) {
        byModuleId.set(module.moduleId, module);
      }
    }

    return [...byModuleId.values()];
  }

  private isEnabledModuleUsable(module: EnabledCompanyModuleRecord): boolean {
    return module.module.isActive !== false;
  }
}
