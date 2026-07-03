import { EntitlementService } from './entitlement.service';

describe('EntitlementService', () => {
  it('returns enabled module codes from company enabled modules', () => {
    const service = new EntitlementService();

    expect(service.getEnabledModuleCodes(buildSource())).toEqual(['TM', 'COA']);
  });

  it('uses latest subscription plan system modules as base entitlements', () => {
    const service = new EntitlementService();

    expect(
      service.getEnabledModuleCodes(
        buildSource({
          enabledModules: [],
          planModules: [
            buildCompanyModule(5, 'TM'),
            buildCompanyModule(8, 'COA'),
          ],
        }),
      ),
    ).toEqual(['TM', 'COA']);
  });

  it('includes company modules outside the plan as compatibility additions', () => {
    const service = new EntitlementService();

    expect(
      service.getEnabledModuleCodes(
        buildSource({
          enabledModules: [buildCompanyModule(9, 'BANK')],
          planModules: [buildCompanyModule(5, 'TM')],
        }),
      ),
    ).toEqual(['TM', 'BANK']);
  });

  it('falls back to company modules when no usable plan modules exist', () => {
    const service = new EntitlementService();

    expect(
      service.getEnabledModuleCodes(
        buildSource({
          enabledModules: [buildCompanyModule(9, 'BANK')],
          planModules: [],
        }),
      ),
    ).toEqual(['BANK']);
  });

  it('de-duplicates plan modules and compatibility company modules', () => {
    const service = new EntitlementService();

    expect(
      service.getEnabledModuleCodes(
        buildSource({
          enabledModules: [buildCompanyModule(5, 'TM')],
          planModules: [buildCompanyModule(5, 'TM')],
        }),
      ),
    ).toEqual(['TM']);
  });

  it('excludes inactive modules from effective entitlements', () => {
    const service = new EntitlementService();

    expect(
      service.getEnabledModuleCodes(
        buildSource({
          enabledModules: [buildCompanyModule(9, 'BANK', false)],
          planModules: [
            buildCompanyModule(5, 'TM'),
            buildCompanyModule(8, 'COA', false),
          ],
        }),
      ),
    ).toEqual(['TM']);
  });

  it('returns enabled module ids from company enabled modules', () => {
    const service = new EntitlementService();

    expect([...service.getEnabledModuleIds(buildSource())]).toEqual([5, 8]);
  });

  it('filters enabled modules by permission while preserving admin access behavior', () => {
    const service = new EntitlementService();
    const enabledModules = buildSource().company.enabledModules;

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

  it('preserves empty company enabled modules behavior', () => {
    const service = new EntitlementService();
    const source = {
      company: {
        enabledModules: [],
      },
    };

    expect(service.getEnabledModuleCodes(source)).toEqual([]);
    expect([...service.getEnabledModuleIds(source)]).toEqual([]);
    expect(
      service.getPermittedEnabledModules([], new Set(['TM:view']), false),
    ).toEqual([]);
  });
});

function buildSource({
  enabledModules = [buildCompanyModule(5, 'TM'), buildCompanyModule(8, 'COA')],
  planModules,
}: {
  enabledModules?: Array<ReturnType<typeof buildCompanyModule>>;
  planModules?: Array<ReturnType<typeof buildCompanyModule>>;
} = {}) {
  return {
    company: {
      enabledModules,
      subscriptions:
        planModules === undefined
          ? []
          : [
              {
                plan: {
                  systems: [
                    {
                      system: {
                        modules: planModules,
                      },
                    },
                  ],
                },
              },
            ],
    },
  };
}

function buildCompanyModule(moduleId: number, code: string, isActive = true) {
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
