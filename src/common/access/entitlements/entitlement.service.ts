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
    return source.company.enabledModules.map((item) => item.module.code);
  }

  getEnabledModuleIds(source: CompanyEnabledModulesSource): Set<number> {
    return new Set(source.company.enabledModules.map((item) => item.moduleId));
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
}
