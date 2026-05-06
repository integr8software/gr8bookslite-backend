import { PermissionAction } from '../enums/permission-action.enum';

export interface PermissionRequirement {
  permission: string;
  action: PermissionAction;
}
