import { BillingCycle, BillingIntervalUnit, SubscriptionPlanScope, SubscriptionPlanStatus, SubscriptionUsageMetric } from '@prisma/client';
import { MasterPlanAndPackagesService } from './master-plan-and-packages.service';

describe('MasterPlanAndPackagesService', () => {
  let service: MasterPlanAndPackagesService;
  let prisma: {
    subscriptionPlan: {
      findUnique: jest.Mock;
      create: jest.Mock;
      findMany: jest.Mock;
    };
    moduleSystem: {
      findMany: jest.Mock;
    };
  };

  beforeEach(() => {
    prisma = {
      subscriptionPlan: {
        findUnique: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
      },
      moduleSystem: {
        findMany: jest.fn().mockResolvedValue([{ id: 1, code: 'ACCOUNTING' }]),
      },
    };
    service = new MasterPlanAndPackagesService(prisma as never);
  });

  it('autogenerates a code from plan name when not provided and resolves scope ALL', async () => {
    prisma.subscriptionPlan.findUnique.mockResolvedValue(null);
    prisma.subscriptionPlan.create.mockImplementation((args) => ({
      id: 10,
      code: args.data.code,
      name: args.data.name,
      description: args.data.description,
      currency: args.data.currency,
      scope: args.data.scope,
      status: args.data.status,
      trialDays: args.data.trialDays,
      isActive: args.data.isActive,
      prices: [],
      usageRules: [],
      discountTiers: [],
      systems: [],
      modules: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    const result = await service.createPlan({
      name: 'Accounting and Inventory Plan',
      scopes: [SubscriptionPlanScope.ONBOARDING, SubscriptionPlanScope.ADDITIONAL_COMPANY],
      status: SubscriptionPlanStatus.ACTIVE,
      trialDays: 14,
      systemCodes: ['ACCOUNTING'],
      prices: [
        {
          billingCycle: BillingCycle.MONTHLY,
          intervalCount: 1,
          intervalUnit: BillingIntervalUnit.MONTH,
          priceInCents: 10000,
        },
        {
          billingCycle: BillingCycle.YEARLY,
          intervalCount: 1,
          intervalUnit: BillingIntervalUnit.YEAR,
          priceInCents: 100000,
        },
      ],
      usageRules: [],
      discountTiers: [],
    } as never);

    expect(prisma.subscriptionPlan.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          code: 'ACCOUNTING_AND_INVENTORY_PLAN',
          scope: SubscriptionPlanScope.ALL,
        }),
      }),
    );
    expect(result.plan.code).toBe('ACCOUNTING_AND_INVENTORY_PLAN');
  });

  it('resolves unique code with suffix when collision occurs', async () => {
    prisma.subscriptionPlan.findUnique
      .mockResolvedValueOnce({ id: 1 })
      .mockResolvedValueOnce(null);

    prisma.subscriptionPlan.create.mockImplementation((args) => ({
      id: 11,
      code: args.data.code,
      name: args.data.name,
      description: null,
      currency: 'PHP',
      scope: args.data.scope,
      status: args.data.status,
      trialDays: 0,
      isActive: true,
      prices: [],
      usageRules: [],
      discountTiers: [],
      systems: [],
      modules: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    await service.createPlan({
      name: 'Standard Plan',
      scope: SubscriptionPlanScope.ALL,
      status: SubscriptionPlanStatus.ACTIVE,
      trialDays: 0,
      systemCodes: ['ACCOUNTING'],
      prices: [
        {
          billingCycle: BillingCycle.MONTHLY,
          intervalCount: 1,
          intervalUnit: BillingIntervalUnit.MONTH,
          priceInCents: 5000,
        },
        {
          billingCycle: BillingCycle.YEARLY,
          intervalCount: 1,
          intervalUnit: BillingIntervalUnit.YEAR,
          priceInCents: 50000,
        },
      ],
      usageRules: [],
      discountTiers: [],
    } as never);

    expect(prisma.subscriptionPlan.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          code: 'STANDARD_PLAN_2',
        }),
      }),
    );
  });
});
