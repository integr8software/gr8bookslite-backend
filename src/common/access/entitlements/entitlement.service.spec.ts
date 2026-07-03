import { EntitlementService } from './entitlement.service';

describe('EntitlementService', () => {
  it('returns enabled module codes from company enabled modules', () => {
    const service = new EntitlementService();

    expect(service.getEnabledModuleCodes(buildSource())).toEqual(['TM', 'COA']);
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

function buildSource() {
  return {
    company: {
      enabledModules: [
        {
          moduleId: 5,
          module: {
            code: 'TM',
            permissions: [{ code: 'TM' }],
          },
        },
        {
          moduleId: 8,
          module: {
            code: 'COA',
            permissions: [{ code: 'COA' }],
          },
        },
      ],
    },
  };
}
