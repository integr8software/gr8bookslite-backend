import { PermissionAction } from '../../enums/permission-action.enum';
import { PermissionService } from './permission.service';

describe('PermissionService', () => {
  it('exposes active cancel and uncancel actions', () => {
    const service = new PermissionService();

    const permissions = service.computePermissions(
      {
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
      },
      ['cash-disbursement'],
    );

    expect(permissions).toEqual(
      expect.arrayContaining([
        `PCFR:${PermissionAction.VIEW}`,
        `PCFR:${PermissionAction.CANCEL}`,
        `PCFR:${PermissionAction.UNCANCEL}`,
      ]),
    );
  });

  it('filters permissions using the related module instead of code prefixes', () => {
    const service = new PermissionService();
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

    expect(
      service.computePermissions(membership, ['cash-disbursement']),
    ).toContain('PCFR:view');
    expect(service.computePermissions(membership, ['OTHER'])).toEqual([]);
  });

  it('merges company and branch role permissions without duplicates', () => {
    const service = new PermissionService();

    expect(
      service.computePermissions(
        {
          companyRole: {
            permissions: [
              buildRolePermission({
                code: 'TM',
                canView: true,
                canCreate: false,
              }),
            ],
          },
          unitAccess: [
            {
              companyRole: {
                permissions: [
                  buildRolePermission({
                    code: 'TM',
                    canView: false,
                    canCreate: true,
                  }),
                ],
              },
            },
          ],
          permissionOverrides: [],
        },
        ['TM'],
      ),
    ).toEqual(['TM:view', 'TM:create']);
  });

  it('applies membership permission overrides after role permissions', () => {
    const service = new PermissionService();

    expect(
      service.computePermissions(
        {
          companyRole: {
            permissions: [
              buildRolePermission({
                code: 'TM',
                canView: true,
                canCreate: false,
              }),
            ],
          },
          unitAccess: [],
          permissionOverrides: [
            {
              canView: false,
              canCreate: true,
              canUpdate: null,
              canCancel: null,
              canUncancel: null,
              canExport: null,
              permission: {
                code: 'TM',
                module: { code: 'TM' },
              },
            },
          ],
        },
        ['TM'],
      ),
    ).toEqual(['TM:create']);
  });

  it('preserves empty permission behavior', () => {
    const service = new PermissionService();

    expect(
      service.computePermissions(
        {
          companyRole: null,
          unitAccess: [],
          permissionOverrides: [],
        },
        [],
      ),
    ).toEqual([]);
  });
});

function buildRolePermission({
  code,
  canView,
  canCreate,
}: {
  code: string;
  canView: boolean;
  canCreate: boolean;
}) {
  return {
    canView,
    canCreate,
    canUpdate: false,
    canCancel: false,
    canUncancel: false,
    canExport: false,
    permission: {
      code,
      module: { code },
    },
  };
}
