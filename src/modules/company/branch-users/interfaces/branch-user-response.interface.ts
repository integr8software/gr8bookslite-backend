export interface BranchUserRolePermissionResponse {
  permissionId: number;
  permissionCode: string;
  moduleCode: string;
  moduleName: string;
  canView: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canApprove: boolean;
  canExport: boolean;
}

export interface BranchUserRoleResponse {
  id: number;
  code: string;
  name: string;
  description: string | null;
  roleType: string;
  scopeLevel: string;
  isSystem: boolean;
  permissions: BranchUserRolePermissionResponse[];
}

export interface BranchUserResponse {
  id: number;
  name: string;
  email: string;
  contactNumber: string | null;
  status: string;
  profileImageUrl: string | null;
  membershipRole: string;
  membershipStatus: string;
  accessScope: string;
  lastAccessedAt: string | null;
  companyRole: BranchUserRoleResponse | null;
}
