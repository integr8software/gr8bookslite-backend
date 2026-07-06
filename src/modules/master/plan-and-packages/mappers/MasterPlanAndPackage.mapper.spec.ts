import { mapMasterPlanAndPackage } from './MasterPlanAndPackage.mapper';

describe('mapMasterPlanAndPackage', () => {
  it('derives legacy module keys from module relation code', () => {
    const result = mapMasterPlanAndPackage({
      id: 1,
      code: 'ACCOUNTING',
      name: 'Accounting',
      description: null,
      currency: 'PHP',
      scope: 'ONBOARDING',
      status: 'ACTIVE',
      trialDays: 15,
      isActive: true,
      prices: [],
      usageRules: [],
      discountTiers: [],
      systems: [],
      modules: [
        {
          isEnabled: true,
          module: {
            id: 8,
            code: 'COA',
            name: 'Chart of Accounts',
          },
        },
      ],
      createdAt: new Date('2026-07-04T00:00:00.000Z'),
      updatedAt: new Date('2026-07-04T00:00:00.000Z'),
    } as never);

    expect(result.legacyModuleKeys).toEqual(['COA']);
  });
});
