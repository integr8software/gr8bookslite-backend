import { mapSubscriptionPlan } from './SubscriptionPlan.mapper';

describe('mapSubscriptionPlan', () => {
  it('derives legacy module response keys from module relation code', () => {
    const result = mapSubscriptionPlan({
      code: 'ACCOUNTING',
      name: 'Accounting',
      description: null,
      trialDays: 15,
      prices: [],
      usageRules: [],
      discountTiers: [],
      systems: [],
      modules: [
        {
          module: {
            id: 8,
            code: 'COA',
            name: 'Chart of Accounts',
          },
        },
      ],
    } as never);

    expect(result.moduleKeys).toEqual(['COA']);
    expect(result.modules).toEqual([
      {
        id: 8,
        moduleKey: 'COA',
        name: 'Chart of Accounts',
        isEnabled: true,
      },
    ]);
  });
});
