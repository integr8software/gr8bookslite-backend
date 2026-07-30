import { ForbiddenException } from '@nestjs/common';
import { MembershipRole, MembershipStatus } from '@prisma/client';
import { AppRole } from '../enums/app-role.enum';
import { PermissionAction } from '../enums/permission-action.enum';
import type { AuthUser } from '../interfaces/auth-user.interface';
import { canAccessModuleAction, ensureModuleAction, getModulePermissions } from './module-permissions.util';

describe('module permission utilities', () => {
  const user = {
    id: 1,
    companyId: 2,
    role: AppRole.USER,
    membershipStatus: MembershipStatus.ACTIVE,
    membershipRole: MembershipRole.USER,
    permissions: ['TM:view', 'TM:create'],
  } as AuthUser;

  it('checks user permissions for the active company module', () => {
    expect(canAccessModuleAction(user, 2, 'TM', PermissionAction.VIEW)).toBe(true);
    expect(canAccessModuleAction(user, 2, 'TM', PermissionAction.UPDATE)).toBe(false);
  });

  it('allows reserved-role users for all module actions', () => {
    expect(
      canAccessModuleAction(
        {
          ...user,
          membershipRole: MembershipRole.ADMIN,
          permissions: [],
        },
        2,
        'TM',
        PermissionAction.UPDATE,
      ),
    ).toBe(true);
  });

  it('throws a forbidden exception when the action is unavailable', () => {
    expect(() => ensureModuleAction(user, 2, 'TM', PermissionAction.UPDATE, 'No access.')).toThrow(ForbiddenException);
  });

  it('builds configurable permission flags', () => {
    expect(getModulePermissions(user, 2, 'TM', { includeImport: true })).toEqual({
      canView: true,
      canCreate: true,
      canUpdate: false,
      canExport: false,
      canImport: true,
    });
  });

  it('supports reserved-only modules with view access open', () => {
    expect(getModulePermissions(user, 2, 'DA', { includeDelete: false, reservedOnly: true, viewAllowed: true })).toEqual({
      canView: true,
      canCreate: false,
      canUpdate: false,
      canDelete: false,
      canExport: false,
    });
  });
});
