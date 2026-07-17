import type { BranchUserMembershipRecord, BranchUserRoleRecord } from '../prisma/branch-user.include';
import type { BranchUserResponse, BranchUserRoleResponse } from '../interfaces/branch-user-response.interface';

export function mapBranchUser(membership: BranchUserMembershipRecord, unitId: number): BranchUserResponse {
  const branchAccess = membership.unitAccess.find((unitAccess) => unitAccess.unitId === unitId);

  return {
    id: membership.user.id,
    name: membership.user.name,
    email: membership.user.email,
    contactNumber: membership.user.contactNumber,
    status: membership.user.status,
    profileImageUrl: membership.user.avatarPublicUrl,
    membershipRole: membership.role,
    membershipStatus: membership.status,
    accessScope: membership.accessScope,
    lastAccessedAt: membership.lastAccessedAt?.toISOString() ?? null,
    companyRole: branchAccess?.companyRole ? mapBranchUserRole(branchAccess.companyRole) : null,
  };
}

function getModule(permission: { module?: { code: string; name: string } | null }) {
  const legacy = permission as typeof permission & {
    submodule?: { module: { code: string; name: string } } | null;
  };
  return permission.module ?? legacy.submodule!.module;
}

export function mapBranchUserRole(role: BranchUserRoleRecord): BranchUserRoleResponse {
  return {
    id: role.id,
    code: role.code,
    name: role.name,
    description: role.description,
    roleType: role.roleType,
    scopeLevel: role.scopeLevel,
    isSystem: role.isSystem,
    permissions: role.permissions.map((rolePermission) => ({
      permissionId: rolePermission.permissionId,
      permissionCode: rolePermission.permission.code,
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
