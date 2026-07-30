import { ForbiddenException } from '@nestjs/common';
import { PermissionAction } from '../enums/permission-action.enum';
import type { AuthUser } from '../interfaces/auth-user.interface';
import { hasReservedRoleAccess } from './module-access.util';

type ModulePermissionOptions = {
  includeImport?: boolean;
  includeDelete?: boolean;
  includeCancel?: boolean;
  includeUncancel?: boolean;
  reservedOnly?: boolean;
  viewAllowed?: boolean;
};

export function canAccessModuleAction(
  user: AuthUser,
  companyId: number,
  moduleCode: string,
  action: PermissionAction,
  options: Pick<ModulePermissionOptions, 'reservedOnly' | 'viewAllowed'> = {},
) {
  if (options.viewAllowed && action === PermissionAction.VIEW) {
    return true;
  }

  if (hasReservedRoleAccess(user, companyId)) {
    return true;
  }

  if (options.reservedOnly) {
    return false;
  }

  return user.companyId === companyId && user.permissions.includes(`${moduleCode}:${action}`);
}

export function ensureModuleAction(
  user: AuthUser,
  companyId: number,
  moduleCode: string,
  action: PermissionAction,
  forbiddenMessage: string,
  options: Pick<ModulePermissionOptions, 'reservedOnly' | 'viewAllowed'> = {},
) {
  if (canAccessModuleAction(user, companyId, moduleCode, action, options)) {
    return;
  }

  throw new ForbiddenException(forbiddenMessage);
}

export function getModulePermissions(user: AuthUser, companyId: number, moduleCode: string, options: ModulePermissionOptions = {}) {
  const can = (action: PermissionAction) => canAccessModuleAction(user, companyId, moduleCode, action, options);

  return {
    canView: can(PermissionAction.VIEW),
    canCreate: can(PermissionAction.CREATE),
    canUpdate: can(PermissionAction.UPDATE),
    ...(options.includeDelete !== undefined ? { canDelete: options.includeDelete ? can(PermissionAction.CANCEL) : false } : {}),
    ...(options.includeCancel ? { canCancel: can(PermissionAction.CANCEL) } : {}),
    ...(options.includeUncancel ? { canUncancel: can(PermissionAction.UNCANCEL) } : {}),
    canExport: can(PermissionAction.EXPORT),
    ...(options.includeImport ? { canImport: can(PermissionAction.CREATE) } : {}),
  };
}
