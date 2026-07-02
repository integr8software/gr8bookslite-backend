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

  it('falls back to permitted enabled modules when sidebar rows are missing', () => {
    const service = new AccessControlService({} as never, {} as never);
    const modules = (
      service as unknown as {
        buildUserModules: (
          membershipRecord: unknown,
          permissions: string[],
        ) => {
          byBranch: Array<{
            branchUnitId: number;
            items: Array<{
              key: string;
              label: string;
              moduleCode: string | null;
            }>;
          }>;
        };
      }
    ).buildUserModules(
      {
        role: 'USER',
        unitAccess: [{ unitId: 10 }],
        company: {
          subscriptions: [],
          units: [{ id: 10 }],
          moduleSidebar: [],
          enabledModules: [
            {
              moduleId: 5,
              module: {
                id: 5,
                code: 'TM',
                name: 'Term Management',
                description: null,
                icon: 'calendar',
                category: 'STANDARD',
                permissions: [{ code: 'TM' }],
              },
            },
          ],
        },
      },
      ['TM:view'],
    );

    expect(modules.byBranch[0]).toEqual(
      expect.objectContaining({
        branchUnitId: 10,
        items: [
          expect.objectContaining({
            label: 'Term Management',
            key: 'module-tm',
            moduleCode: 'TM',
          }),
        ],
      }),
    );
  });

  it('builds enabled fallback modules from module code only', () => {
    const service = new AccessControlService({} as never, {} as never);
    const modules = (
      service as unknown as {
        buildUserModules: (
          membershipRecord: unknown,
          permissions: string[],
        ) => {
          byBranch: Array<{
            branchUnitId: number;
            items: Array<{
              key: string;
              moduleCode: string | null;
            }>;
          }>;
        };
      }
    ).buildUserModules(
      {
        role: 'USER',
        unitAccess: [{ unitId: 10 }],
        company: {
          subscriptions: [],
          units: [{ id: 10 }],
          moduleSidebar: [],
          enabledModules: [
            {
              moduleId: 5,
              module: {
                id: 5,
                code: 'TM',
                name: 'Term Management',
                description: null,
                icon: 'calendar',
                category: 'STANDARD',
                permissions: [{ code: 'TM' }],
              },
            },
          ],
        },
      },
      ['TM:view'],
    );

    expect(modules.byBranch[0].items[0]).toEqual(
      expect.objectContaining({
        key: 'module-tm',
        moduleCode: 'TM',
      }),
    );
  });

  it('uses system sidebar templates as the default navigation when user sidebar rows are missing', () => {
    const service = new AccessControlService({} as never, {} as never);
    const modules = (
      service as unknown as {
        buildUserModules: (
          membershipRecord: unknown,
          permissions: string[],
        ) => {
          byBranch: Array<{
            branchUnitId: number;
            items: Array<{
              key: string;
              label: string;
              moduleCode: string | null;
              children: Array<{
                key: string;
                moduleCode: string | null;
              }>;
            }>;
          }>;
        };
      }
    ).buildUserModules(
      {
        role: 'USER',
        accessScope: 'BRANCH',
        unitAccess: [{ unitId: 10 }],
        company: {
          units: [{ id: 10 }],
          moduleSidebar: [],
          enabledModules: [
            {
              moduleId: 5,
              module: {
                id: 5,
                code: 'TM',
                name: 'Term Management',
                description: null,
                icon: 'calendar',
                category: 'STANDARD',
                permissions: [{ code: 'TM' }],
              },
            },
          ],
          subscriptions: [
            {
              plan: {
                systems: [
                  {
                    system: {
                      code: 'ACCOUNTING',
                      sidebarItems: [
                        {
                          id: 100,
                          parentId: null,
                          moduleId: null,
                          itemType: 'SECTION',
                          key: 'financial-maintenance',
                          label: 'Financial Maintenance',
                          description: null,
                          iconName: 'accounting',
                          sortOrder: 0,
                        },
                        {
                          id: 101,
                          parentId: 100,
                          moduleId: 5,
                          itemType: 'LINK',
                          key: 'financial-maintenance-term-management',
                          label: 'Term Management',
                          description: null,
                          iconName: 'calendar',
                          sortOrder: 0,
                        },
                      ],
                    },
                  },
                ],
              },
            },
          ],
        },
      },
      ['TM:view'],
    );

    expect(modules.byBranch[0].items[0]).toEqual(
      expect.objectContaining({
        key: 'accounting-financial-maintenance',
        label: 'Financial Maintenance',
        moduleCode: null,
        children: [
          expect.objectContaining({
            key: 'accounting-financial-maintenance-term-management',
            moduleCode: 'TM',
          }),
        ],
      }),
    );
  });
});
