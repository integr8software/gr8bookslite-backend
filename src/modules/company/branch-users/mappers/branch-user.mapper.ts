import type {
  BranchUserMembershipRecord,
  BranchUserRoleRecord,
} from '../prisma/branch-user.include';
import type {
  BranchUserResponse,
  BranchUserRoleResponse,
} from '../interfaces/branch-user-response.interface';

export function mapBranchUser(
  membership: BranchUserMembershipRecord,
): BranchUserResponse {
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
    companyRole: membership.companyRole
      ? mapBranchUserRole(membership.companyRole)
      : null,
  };
}

export function mapBranchUserRole(
  role: BranchUserRoleRecord,
): BranchUserRoleResponse {
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
