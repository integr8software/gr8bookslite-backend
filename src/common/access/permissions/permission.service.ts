import { Injectable } from '@nestjs/common';
import { PermissionAction } from '../../enums/permission-action.enum';
import type { PermissionActionMap, PermissionMembershipSource, PermissionRecord } from './permission.types';

@Injectable()
export class PermissionService {
  computePermissions(membership: PermissionMembershipSource, enabledModules: string[]): string[] {
    const permissions = new Map<string, PermissionActionMap>();

    for (const rolePermission of this.collectRolePermissions(membership)) {
      if (!this.isPermissionWithinEnabledModules(rolePermission.permission, enabledModules)) {
        continue;
      }

      const current = permissions.get(rolePermission.permission.code);
      permissions.set(rolePermission.permission.code, {
        [PermissionAction.VIEW]: Boolean(current?.view) || rolePermission.canView,
        [PermissionAction.CREATE]: Boolean(current?.create) || rolePermission.canCreate,
        [PermissionAction.UPDATE]: Boolean(current?.update) || rolePermission.canUpdate,
        [PermissionAction.CANCEL]: Boolean(current?.cancel) || rolePermission.canCancel,
        [PermissionAction.UNCANCEL]: Boolean(current?.uncancel) || rolePermission.canUncancel,
        [PermissionAction.EXPORT]: Boolean(current?.export) || rolePermission.canExport,
      });
    }

    for (const override of membership.permissionOverrides) {
      if (!this.isPermissionWithinEnabledModules(override.permission, enabledModules)) {
        continue;
      }

      const current = permissions.get(override.permission.code) ?? this.buildEmptyActionMap();

      permissions.set(override.permission.code, {
        [PermissionAction.VIEW]: override.canView ?? current.view,
        [PermissionAction.CREATE]: override.canCreate ?? current.create,
        [PermissionAction.UPDATE]: override.canUpdate ?? current.update,
        [PermissionAction.CANCEL]: override.canCancel ?? current.cancel,
        [PermissionAction.UNCANCEL]: override.canUncancel ?? current.uncancel,
        [PermissionAction.EXPORT]: override.canExport ?? current.export,
      });
    }

    return this.serializePermissions(permissions);
  }

  private collectRolePermissions(membership: PermissionMembershipSource) {
    return [...(membership.companyRole?.permissions ?? []), ...membership.unitAccess.flatMap((unitAccess) => unitAccess.companyRole?.permissions ?? [])];
  }

  private isPermissionWithinEnabledModules(permission: PermissionRecord, enabledModules: string[]): boolean {
    const moduleCode = this.getPermissionModuleCode(permission);

    return !moduleCode || enabledModules.length === 0 || enabledModules.includes(moduleCode);
  }

  private getPermissionModuleCode(permission: PermissionRecord) {
    return permission.module?.code ?? permission.submodule?.module.code;
  }

  private buildEmptyActionMap(): PermissionActionMap {
    return {
      [PermissionAction.VIEW]: false,
      [PermissionAction.CREATE]: false,
      [PermissionAction.UPDATE]: false,
      [PermissionAction.CANCEL]: false,
      [PermissionAction.UNCANCEL]: false,
      [PermissionAction.EXPORT]: false,
    };
  }

  private serializePermissions(permissions: Map<string, PermissionActionMap>): string[] {
    return Array.from(permissions.entries()).flatMap(([permissionCode, actions]) =>
      Object.values(PermissionAction)
        .filter((action) => actions[action])
        .map((action) => this.buildPermissionKey(permissionCode, action)),
    );
  }

  private buildPermissionKey(permissionCode: string, action: PermissionAction): string {
    return `${permissionCode}:${action}`;
  }
}
