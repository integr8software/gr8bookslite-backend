import type { BranchRoleResponse } from '../interfaces/branch-role-response.interface';
import type { BranchRoleRecord } from '../prisma/branch-role.include';

export function mapBranchRole(role: BranchRoleRecord): BranchRoleResponse {
  return {
    id: role.id,
    code: role.code,
    name: role.name,
    description: role.description,
    roleType: role.roleType,
    scopeLevel: role.scopeLevel,
    isSystem: role.isSystem,
    isActive: role.isActive,
    permissions: role.permissions.map((rolePermission) => ({
      permissionId: rolePermission.permissionId,
      permissionCode: rolePermission.permission.code,
      permissionName: rolePermission.permission.name,
      moduleCode: getModule(rolePermission.permission).code,
      moduleName: getModule(rolePermission.permission).name,
      canView: rolePermission.canView,
      canCreate: rolePermission.canCreate,
      canUpdate: rolePermission.canUpdate,
      canCancel: rolePermission.canCancel,
      canUncancel: rolePermission.canUncancel,
      canExport: rolePermission.canExport,
      actions: [
        rolePermission.canView ? 'view' : null,
        rolePermission.canCreate ? 'create' : null,
        rolePermission.canUpdate ? 'update' : null,
        rolePermission.canCancel ? 'cancel' : null,
        rolePermission.canUncancel ? 'uncancel' : null,
        rolePermission.canExport ? 'export' : null,
      ].filter((action): action is string => action !== null),
    })),
  };
}

function getModule(permission: { module?: { code: string; name: string } | null }) {
  const legacy = permission as typeof permission & {
    submodule?: { module: { code: string; name: string } } | null;
  };
  return permission.module ?? legacy.submodule!.module;
}
