export interface BranchRolePermissionResponse {
  permissionId: number;
  permissionCode: string;
  permissionName: string;
  moduleCode: string;
  moduleName: string;
  canView: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canCancel: boolean;
  canUncancel: boolean;
  canExport: boolean;
  actions: string[];
}

export interface BranchRoleResponse {
  id: number;
  code: string;
  name: string;
  description: string | null;
  roleType: string;
  scopeLevel: string;
  isSystem: boolean;
  isActive: boolean;
  permissions: BranchRolePermissionResponse[];
}
