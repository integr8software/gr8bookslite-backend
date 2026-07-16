import { EntitlementService } from './entitlement.service';

describe('EntitlementService', () => {
  it('returns modules from latest usable subscription plan systems', () => {
    const service = new EntitlementService();

    expect(
      service.getEnabledModuleCodes(
        buildSource({
          planSystems: [
            {
              modules: [buildPlanModule(5, 'TM'), buildPlanModule(8, 'COA')],
            },
          ],
        }),
      ),
    ).toEqual(['TM', 'COA']);
  });

  it('de-duplicates modules across multiple systems', () => {
    const service = new EntitlementService();

    expect(
      service.getEnabledModuleCodes(
        buildSource({
          planSystems: [
            {
              modules: [buildPlanModule(5, 'TM'), buildPlanModule(8, 'COA')],
            },
            {
              modules: [buildPlanModule(5, 'TM'), buildPlanModule(9, 'BANK')],
            },
          ],
        }),
      ),
    ).toEqual(['TM', 'COA', 'BANK']);
  });

  it('excludes inactive modules', () => {
    const service = new EntitlementService();

    expect(
      service.getEnabledModuleCodes(
        buildSource({
          planSystems: [
            {
              modules: [
                buildPlanModule(5, 'TM'),
                buildPlanModule(8, 'COA', false),
              ],
            },
          ],
        }),
      ),
    ).toEqual(['TM']);
  });

  it('returns empty modules when no usable plan exists', () => {
    const service = new EntitlementService();

    expect(
      service.getEnabledModuleCodes(buildSource({ noPlan: true })),
    ).toEqual([]);
    expect([
      ...service.getEnabledModuleIds(buildSource({ noPlan: true })),
    ]).toEqual([]);
  });

  it('uses subscription plan modules even when legacy-shaped fields are present', () => {
    const service = new EntitlementService();
    const company = {
      subscriptions: [
        {
          plan: {
            systems: [
              {
                system: {
                  modules: [buildPlanModule(5, 'TM')],
                },
              },
            ],
          },
        },
      ],
    } as Record<string, unknown>;

    company.legacyEnabledRows = [buildPlanModule(9, 'BANK')];
    company.legacyExceptionRows = [
      {
        ...buildPlanModule(8, 'COA'),
        effect: 'ENABLE',
      },
    ];

    expect(
      service.getEnabledModuleCodes({
        company,
      }),
    ).toEqual(['TM']);
  });

  it('filters enabled modules by permission while preserving admin access behavior', () => {
    const service = new EntitlementService();
    const enabledModules = [
      buildPlanModule(5, 'TM'),
      buildPlanModule(8, 'COA'),
    ];

    expect(
      service.getPermittedEnabledModules(
        enabledModules,
        new Set(['TM:view']),
        false,
      ),
    ).toEqual([enabledModules[0]]);
    expect(
      service.getPermittedEnabledModules(enabledModules, new Set(), true),
    ).toEqual(enabledModules);
  });
});

function buildSource({
  planSystems = [{ modules: [buildPlanModule(5, 'TM')] }],
  noPlan = false,
}: {
  planSystems?: Array<{ modules: Array<ReturnType<typeof buildPlanModule>> }>;
  noPlan?: boolean;
} = {}) {
  return {
    company: {
      subscriptions: noPlan
        ? []
        : [
            {
              plan: {
                systems: planSystems.map((planSystem) => ({
                  system: {
                    modules: planSystem.modules,
                  },
                })),
              },
            },
          ],
    },
  };
}

function buildPlanModule(moduleId: number, code: string, isActive = true) {
  return {
    moduleId,
    module: {
      id: moduleId,
      code,
      isActive,
      permissions: [{ code }],
    },
  };
}
