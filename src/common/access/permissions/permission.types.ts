import { PermissionAction } from '../../enums/permission-action.enum';

export type PermissionModuleRecord = {
  code: string;
};

export type PermissionRecord = {
  code: string;
  module?: PermissionModuleRecord | null;
  submodule?: { module: PermissionModuleRecord } | null;
};

export type RolePermissionRecord = {
  canView: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canCancel: boolean;
  canUncancel: boolean;
  canExport: boolean;
  permission: PermissionRecord;
};

export type PermissionOverrideRecord = {
  canView: boolean | null;
  canCreate: boolean | null;
  canUpdate: boolean | null;
  canCancel: boolean | null;
  canUncancel: boolean | null;
  canExport: boolean | null;
  permission: PermissionRecord;
};

export type PermissionMembershipSource = {
  companyRole?: { permissions: RolePermissionRecord[] } | null;
  unitAccess: Array<{
    companyRole?: { permissions: RolePermissionRecord[] } | null;
  }>;
  permissionOverrides: PermissionOverrideRecord[];
};

export type PermissionActionMap = Record<PermissionAction, boolean>;
