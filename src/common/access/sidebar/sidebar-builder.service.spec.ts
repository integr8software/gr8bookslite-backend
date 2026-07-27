import { AccessScopeLevel, MembershipRole } from '@prisma/client';
import { EntitlementService } from '../entitlements/entitlement.service';
import { SidebarBuilder } from './sidebar-builder.service';
import type { SidebarMembershipSource } from './sidebar-builder.types';

describe('SidebarBuilder', () => {
  it('falls back to permitted enabled modules when sidebar rows are missing', () => {
    const builder = createSidebarBuilder();
    const modules = builder.buildUserModules(
      buildMembership({
        planModules: [buildEnabledModule(5, 'TM', 'Terms Maintenance')],
      }),
      ['TM:view'],
    );

    expect(modules.byBranch[0]).toEqual(
      expect.objectContaining({
        branchUnitId: 10,
        items: [
          expect.objectContaining({
            label: 'Terms Maintenance',
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
        planModules: [buildEnabledModule(5, 'TM', 'Terms Maintenance')],
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
                    modules: [buildEnabledModule(5, 'TM', 'Terms Maintenance')],
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
                        key: 'financial-maintenance-terms-maintenance',
                        label: 'Terms Maintenance',
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
            key: 'accounting-financial-maintenance-terms-maintenance',
            moduleCode: 'TM',
          }),
        ],
      }),
    );
  });

  it('merges user preference deltas into the plan-derived default sidebar', () => {
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
                    modules: [buildEnabledModule(5, 'TM', 'Terms Maintenance'), buildEnabledModule(6, 'COA', 'Chart of Accounts')],
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
                        moduleId: 6,
                        itemType: 'LINK',
                        key: 'financial-maintenance-charts-of-accounts',
                        label: 'Chart of Accounts',
                        description: null,
                        iconName: 'scale',
                        sortOrder: 0,
                      },
                      {
                        id: 102,
                        parentId: 100,
                        moduleId: 5,
                        itemType: 'LINK',
                        key: 'financial-maintenance-terms-maintenance',
                        label: 'Terms Maintenance',
                        description: null,
                        iconName: 'calendar',
                        sortOrder: 1,
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
        sidebarPreferences: [
          {
            branchUnitId: 10,
            itemKey: 'accounting-financial-maintenance',
            parentItemKey: null,
            hasParentOverride: false,
            isHidden: false,
            sortOrder: null,
            isPinned: true,
            isCollapsed: true,
          },
          {
            branchUnitId: 10,
            itemKey: 'accounting-financial-maintenance-charts-of-accounts',
            parentItemKey: null,
            hasParentOverride: false,
            isHidden: true,
            sortOrder: null,
            isPinned: false,
            isCollapsed: false,
          },
        ],
      }),
      ['TM:view', 'COA:view'],
    );

    expect(modules.byBranch[0].items[0]).toEqual(
      expect.objectContaining({
        key: 'accounting-financial-maintenance',
        isPinned: true,
        isCollapsed: true,
        children: [
          expect.objectContaining({
            key: 'accounting-financial-maintenance-terms-maintenance',
            moduleCode: 'TM',
          }),
        ],
      }),
    );
  });

  it('moves sidebar items across sections using parent preference deltas', () => {
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
                    modules: [buildEnabledModule(5, 'TM', 'Terms Maintenance'), buildEnabledModule(6, 'COA', 'Chart of Accounts')],
                    sidebarItems: [
                      {
                        id: 100,
                        parentId: null,
                        moduleId: null,
                        itemType: 'SECTION',
                        key: 'maintenance',
                        label: 'Maintenance',
                        description: null,
                        iconName: null,
                        sortOrder: 0,
                      },
                      {
                        id: 101,
                        parentId: 100,
                        moduleId: 6,
                        itemType: 'LINK',
                        key: 'chart-of-accounts',
                        label: 'Chart of Accounts',
                        description: null,
                        iconName: null,
                        sortOrder: 0,
                      },
                      {
                        id: 200,
                        parentId: null,
                        moduleId: null,
                        itemType: 'SECTION',
                        key: 'general-journal',
                        label: 'General Journal',
                        description: null,
                        iconName: null,
                        sortOrder: 1,
                      },
                      {
                        id: 201,
                        parentId: 200,
                        moduleId: 5,
                        itemType: 'LINK',
                        key: 'terms-maintenance',
                        label: 'Terms Maintenance',
                        description: null,
                        iconName: null,
                        sortOrder: 0,
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
        sidebarPreferences: [
          {
            branchUnitId: 10,
            itemKey: 'accounting-chart-of-accounts',
            parentItemKey: 'accounting-general-journal',
            hasParentOverride: true,
            isHidden: false,
            sortOrder: 1,
            isPinned: false,
            isCollapsed: false,
          },
        ],
      }),
      ['TM:view', 'COA:view'],
    );

    expect(modules.byBranch[0].items).toEqual([
      expect.objectContaining({
        key: 'accounting-general-journal',
        children: [
          expect.objectContaining({
            key: 'accounting-terms-maintenance',
          }),
          expect.objectContaining({
            key: 'accounting-chart-of-accounts',
          }),
        ],
      }),
    ]);
  });
});

function createSidebarBuilder() {
  return new SidebarBuilder(new EntitlementService());
}

type BuildMembershipOptions = Partial<Omit<SidebarMembershipSource['company'], 'subscriptions'>> & {
  planModules?: Array<ReturnType<typeof buildEnabledModule>>;
  subscriptions?: SidebarMembershipSource['company']['subscriptions'];
};

function buildMembership({ planModules = [], sidebarPreferences = [], subscriptions }: BuildMembershipOptions = {}): SidebarMembershipSource {
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
      sidebarPreferences,
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
