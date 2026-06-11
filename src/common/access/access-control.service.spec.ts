import { PermissionAction } from '../enums/permission-action.enum';
import { AccessControlService } from './access-control.service';

describe('AccessControlService permission architecture', () => {
  it('exposes the active cancel and uncancel actions', () => {
    const service = new AccessControlService({} as never, {} as never);
    const membership = {
      companyRole: {
        permissions: [
          {
            canView: true,
            canCreate: false,
            canUpdate: false,
            canCancel: true,
            canUncancel: true,
            canExport: false,
            permission: {
              code: 'PCFR',
              module: null,
              submodule: {
                module: {
                  code: 'cash-disbursement',
                },
              },
            },
          },
        ],
      },
      unitAccess: [],
      permissionOverrides: [],
    };

    const permissions = (
      service as unknown as {
        buildEffectivePermissions: (
          membershipRecord: unknown,
          enabledModules: string[],
        ) => string[];
      }
    ).buildEffectivePermissions(membership, ['cash-disbursement']);

    expect(permissions).toEqual(
      expect.arrayContaining([
        `PCFR:${PermissionAction.VIEW}`,
        `PCFR:${PermissionAction.CANCEL}`,
        `PCFR:${PermissionAction.UNCANCEL}`,
      ]),
    );
  });

  it('filters permissions using the related module instead of code prefixes', () => {
    const service = new AccessControlService({} as never, {} as never);
    const membership = {
      companyRole: {
        permissions: [
          {
            canView: true,
            canCreate: false,
            canUpdate: false,
            canCancel: false,
            canUncancel: false,
            canExport: false,
            permission: {
              code: 'PCFR',
              module: null,
              submodule: {
                module: {
                  code: 'cash-disbursement',
                },
              },
            },
          },
        ],
      },
      unitAccess: [],
      permissionOverrides: [],
    };
    const permissionBuilder = service as unknown as {
      buildEffectivePermissions: (
        membershipRecord: unknown,
        enabledModules: string[],
      ) => string[];
    };

    expect(
      permissionBuilder.buildEffectivePermissions(membership, [
        'cash-disbursement',
      ]),
    ).toContain('PCFR:view');
    expect(
      permissionBuilder.buildEffectivePermissions(membership, ['OTHER']),
    ).toEqual([]);
  });
});
