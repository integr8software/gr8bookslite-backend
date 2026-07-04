import { AccessScopeLevel, MembershipRole } from '@prisma/client';
import { EntitlementService } from '../entitlements/entitlement.service';
import { SidebarBuilder } from './sidebar-builder.service';
import type { SidebarMembershipSource } from './sidebar-builder.types';

describe('SidebarBuilder', () => {
  it('falls back to permitted enabled modules when sidebar rows are missing', () => {
    const builder = createSidebarBuilder();
    const modules = builder.buildUserModules(
      buildMembership({
        planModules: [buildEnabledModule(5, 'TM', 'Term Management')],
      }),
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
    const builder = createSidebarBuilder();
    const modules = builder.buildUserModules(
      buildMembership({
        planModules: [buildEnabledModule(5, 'TM', 'Term Management')],
      }),
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
    const builder = createSidebarBuilder();
    const modules = builder.buildUserModules(
      buildMembership({
        subscriptions: [
          {
            plan: {
              systems: [
                {
                  system: {
                    code: 'ACCOUNTING',
                    modules: [buildEnabledModule(5, 'TM', 'Term Management')],
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
      }),
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

  it('preserves customized sidebar rows before adding missing fallback modules', () => {
    const builder = createSidebarBuilder();
    const modules = builder.buildUserModules(
      buildMembership({
        planModules: [
          buildEnabledModule(5, 'TM', 'Term Management'),
          buildEnabledModule(6, 'COA', 'Chart of Accounts'),
        ],
        moduleSidebar: [
          {
            id: 200,
            branchUnitId: 10,
            parentId: null,
            moduleId: 5,
            itemType: 'LINK',
            key: 'custom-term-management',
            label: 'Custom Term Management',
            description: null,
            iconName: 'calendar',
            sortOrder: 1,
            module: {
              ...buildEnabledModule(5, 'TM', 'Term Management').module,
              isActive: true,
            },
          },
        ],
      }),
      ['TM:view', 'COA:view'],
    );

    expect(modules.byBranch[0].items).toEqual([
      expect.objectContaining({
        id: 200,
        key: 'custom-term-management',
        moduleCode: 'TM',
      }),
      expect.objectContaining({
        key: 'module-coa',
        moduleCode: 'COA',
      }),
    ]);
  });
});

function createSidebarBuilder() {
  return new SidebarBuilder(new EntitlementService());
}

type BuildMembershipOptions = Partial<
  Omit<SidebarMembershipSource['company'], 'subscriptions'>
> & {
  planModules?: Array<ReturnType<typeof buildEnabledModule>>;
  subscriptions?: SidebarMembershipSource['company']['subscriptions'];
};

function buildMembership({
  planModules = [],
  moduleSidebar = [],
  subscriptions,
}: BuildMembershipOptions = {}): SidebarMembershipSource {
  const planSubscriptions =
    subscriptions ??
    (planModules.length
      ? [
          {
            plan: {
              systems: [
                {
                  system: {
                    code: 'ACCOUNTING',
                    modules: planModules,
                    sidebarItems: [],
                  },
                },
              ],
            },
          },
        ]
      : []);

  return {
    role: MembershipRole.USER,
    accessScope: AccessScopeLevel.BRANCH,
    unitAccess: [{ unitId: 10 }],
    company: {
      units: [{ id: 10 }],
      moduleSidebar,
      subscriptions: planSubscriptions,
    },
  };
}

function buildEnabledModule(moduleId: number, code: string, name: string) {
  return {
    moduleId,
    module: {
      id: moduleId,
      code,
      name,
      description: null,
      icon: 'calendar',
      category: 'STANDARD',
      permissions: [{ code }],
    },
  };
}
