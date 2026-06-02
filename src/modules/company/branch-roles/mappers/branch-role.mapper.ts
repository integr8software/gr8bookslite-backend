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
      moduleCode: rolePermission.permission.module.code,
      moduleName: rolePermission.permission.module.name,
      canView: rolePermission.canView,
      canCreate: rolePermission.canCreate,
      canUpdate: rolePermission.canUpdate,
      canDelete: rolePermission.canDelete,
      canApprove: rolePermission.canApprove,
      canExport: rolePermission.canExport,
    })),
  };
}
