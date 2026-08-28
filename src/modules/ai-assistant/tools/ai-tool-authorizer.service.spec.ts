import { MembershipRole, MembershipStatus } from '@prisma/client';
import type { AccessControlService } from '../../../common/access/access-control.service';
import { AppRole } from '../../../common/enums/app-role.enum';
import { PermissionAction } from '../../../common/enums/permission-action.enum';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { AiToolAuthorizerService } from './ai-tool-authorizer.service';

describe('AiToolAuthorizerService', () => {
  const user = {
    id: 42,
    companyId: 1,
    role: AppRole.USER,
    membershipRole: MembershipRole.USER,
    membershipStatus: MembershipStatus.ACTIVE,
    enabledModules: ['SI'],
    permissions: ['SI:view'],
  } as AuthUser;

  function createService(hasPermission = false) {
    const hasPermissionMock = jest.fn().mockReturnValue(hasPermission);
    const accessControlService = {
      hasPermission: hasPermissionMock,
    } as unknown as AccessControlService;

    return {
      hasPermissionMock,
      service: new AiToolAuthorizerService(accessControlService),
    };
  }

  it('allows super administrators to use a registered module', () => {
    const { hasPermissionMock, service } = createService();

    expect(service.authorize({ ...user, role: AppRole.SUPER_ADMIN }, 'SI', PermissionAction.VIEW)).toEqual({ allowed: true });
    expect(hasPermissionMock).not.toHaveBeenCalled();
  });

  it('requires a selected company for regular users', () => {
    const { service } = createService();

    expect(service.authorize({ ...user, companyId: null }, 'SI', PermissionAction.VIEW)).toEqual({
      allowed: false,
      denialMessage: 'Please select a company before I can help with Sales Invoice.',
    });
  });

  it('rejects modules that are not enabled for the selected company', () => {
    const { service } = createService();

    expect(service.authorize({ ...user, enabledModules: [] }, 'SI', PermissionAction.VIEW)).toEqual({
      allowed: false,
      denialMessage: 'Sales Invoice is not enabled for the selected company.',
    });
  });

  it('allows active company administrators without an explicit module permission', () => {
    const { hasPermissionMock, service } = createService();

    expect(service.authorize({ ...user, role: AppRole.ADMIN }, 'SI', PermissionAction.UPDATE)).toEqual({ allowed: true });
    expect(hasPermissionMock).not.toHaveBeenCalled();
  });

  it('uses access-control permissions for regular users', () => {
    const { hasPermissionMock, service } = createService(true);

    expect(service.authorize(user, 'SI', PermissionAction.VIEW)).toEqual({ allowed: true });
    expect(hasPermissionMock).toHaveBeenCalledWith(user, 'SI', PermissionAction.VIEW);
  });

  it('returns an action-specific denial when permission is missing', () => {
    const { service } = createService();

    expect(service.authorize(user, 'SI', PermissionAction.UPDATE)).toEqual({
      allowed: false,
      denialMessage: 'You do not have permission to edit records in Sales Invoice.',
    });
  });

  it('rejects module codes outside the Neo AI catalog', () => {
    const { service } = createService();

    expect(service.authorize(user, 'UNKNOWN', PermissionAction.VIEW)).toEqual({
      allowed: false,
      denialMessage: 'That module is not available to Neo AI.',
    });
  });
});
