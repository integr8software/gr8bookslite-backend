import { AppRole } from '../enums/app-role.enum';
import { PermissionAction } from '../enums/permission-action.enum';
import { AccessControlService } from './access-control.service';
import { EntitlementService } from './entitlements/entitlement.service';
import { PermissionService } from './permissions/permission.service';
import { SidebarBuilder } from './sidebar/sidebar-builder.service';

describe('AccessControlService', () => {
  it('allows super admins through permission checks', () => {
    const service = createAccessControlService();

    expect(
      service.hasPermission(
        {
          role: AppRole.SUPER_ADMIN,
          companyId: null,
          permissions: [],
        } as never,
        'ANY',
        PermissionAction.VIEW,
      ),
    ).toBe(true);
  });

  it('checks permission keys for company-scoped users', () => {
    const service = createAccessControlService();

    expect(
      service.hasPermission(
        {
          role: AppRole.USER,
          companyId: 1,
          permissions: ['TM:view'],
        } as never,
        'TM',
        PermissionAction.VIEW,
      ),
    ).toBe(true);
    expect(
      service.hasPermission(
        {
          role: AppRole.USER,
          companyId: 1,
          permissions: ['TM:view'],
        } as never,
        'TM',
        PermissionAction.CREATE,
      ),
    ).toBe(false);
  });
});

function createAccessControlService() {
  const entitlementService = new EntitlementService();

  return new AccessControlService(
    {} as never,
    {} as never,
    entitlementService,
    new PermissionService(),
    new SidebarBuilder(entitlementService),
  );
}
