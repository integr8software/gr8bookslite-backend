import { prisma } from './prismaClient';

const plans = [
  {
    code: 'ACCOUNTING',
    name: 'Accounting',
    description: 'Accounting plan with a 15-day free trial.',
    currency: 'PHP',
    monthlyPriceInCents: 39900,
    yearlyPriceInCents: 399000,
    monthlyCompareAtInCents: 49900,
    yearlyCompareAtInCents: 478800,
    scope: 'ONBOARDING',
    status: 'ACTIVE',
    trialDays: 15,
    systemCodes: ['ACCOUNTING'],
  },
  {
    code: 'ACCOUNTING_AND_INVENTORY',
    name: 'Accounting and Inventory',
    description: 'Accounting and inventory plan with a 15-day free trial.',
    currency: 'PHP',
    monthlyPriceInCents: 49900,
    yearlyPriceInCents: 499000,
    monthlyCompareAtInCents: 59900,
    yearlyCompareAtInCents: 598800,
    scope: 'ONBOARDING',
    status: 'ACTIVE',
    trialDays: 15,
    systemCodes: ['ACCOUNTING_AND_INVENTORY'],
  },
  {
    code: 'ADDITIONAL_COMPANY_ACCOUNTING',
    name: 'Accounting',
    description: 'Additional company accounting plan without a free trial.',
    currency: 'PHP',
    monthlyPriceInCents: 39900,
    yearlyPriceInCents: 399000,
    monthlyCompareAtInCents: 49900,
    yearlyCompareAtInCents: 478800,
    scope: 'ADDITIONAL_COMPANY',
    status: 'ACTIVE',
    trialDays: 0,
    systemCodes: ['ACCOUNTING'],
  },
  {
    code: 'ADDITIONAL_COMPANY_ACCOUNTING_AND_INVENTORY',
    name: 'Accounting and Inventory',
    description:
      'Additional company accounting and inventory plan without a free trial.',
    currency: 'PHP',
    monthlyPriceInCents: 49900,
    yearlyPriceInCents: 499000,
    monthlyCompareAtInCents: 59900,
    yearlyCompareAtInCents: 598800,
    scope: 'ADDITIONAL_COMPANY',
    status: 'ACTIVE',
    trialDays: 0,
    systemCodes: ['ACCOUNTING_AND_INVENTORY'],
  },
] as const;

const defaultUsageRules = [
  {
    metric: 'USER',
    freeCount: 1,
    unitPriceInCents: 10000,
  },
] as const;

const defaultDiscountTiers = [
  {
    metric: 'BRANCH',
    thresholdCount: 10,
    discountPercent: '5.00',
  },
  {
    metric: 'BRANCH',
    thresholdCount: 25,
    discountPercent: '10.00',
  },
  {
    metric: 'BRANCH',
    thresholdCount: 50,
    discountPercent: '20.00',
  },
] as const;

export async function seedSubscriptionPlans() {
  await prisma.subscriptionPlan.updateMany({
    where: {
      code: {
        in: [
          'ADDITIONAL_COMPANY',
          'ACCOUNTING_AND_INVENTORY',
          'ADDITIONAL_COMPANY_ACCOUNTING_AND_INVENTORY',
        ],
      },
    },
    data: {
      isActive: false,
      status: 'INACTIVE',
    },
  });

  for (const plan of plans) {
    const {
      monthlyPriceInCents,
      yearlyPriceInCents,
      monthlyCompareAtInCents,
      yearlyCompareAtInCents,
      systemCodes,
      ...planData
    } = plan;
    const subscriptionPlan = await prisma.subscriptionPlan.upsert({
      where: {
        code: plan.code,
      },
      update: {
        name: plan.name,
        description: plan.description,
        currency: plan.currency,
        scope: plan.scope,
        status: plan.status,
        trialDays: plan.trialDays,
        isActive: true,
      },
      create: planData,
    });

    await Promise.all([
      prisma.subscriptionPlanPrice.upsert({
        where: {
          subscriptionPlanId_billingCycle: {
            subscriptionPlanId: subscriptionPlan.id,
            billingCycle: 'MONTHLY',
          },
        },
        update: {
          intervalCount: 1,
          intervalUnit: 'MONTH',
          priceInCents: monthlyPriceInCents,
          compareAtInCents: monthlyCompareAtInCents,
          isActive: true,
        },
        create: {
          subscriptionPlanId: subscriptionPlan.id,
          billingCycle: 'MONTHLY',
          intervalCount: 1,
          intervalUnit: 'MONTH',
          priceInCents: monthlyPriceInCents,
          compareAtInCents: monthlyCompareAtInCents,
          isActive: true,
        },
      }),
      prisma.subscriptionPlanPrice.upsert({
        where: {
          subscriptionPlanId_billingCycle: {
            subscriptionPlanId: subscriptionPlan.id,
            billingCycle: 'YEARLY',
          },
        },
        update: {
          intervalCount: 1,
          intervalUnit: 'YEAR',
          priceInCents: yearlyPriceInCents,
          compareAtInCents: yearlyCompareAtInCents,
          isActive: true,
        },
        create: {
          subscriptionPlanId: subscriptionPlan.id,
          billingCycle: 'YEARLY',
          intervalCount: 1,
          intervalUnit: 'YEAR',
          priceInCents: yearlyPriceInCents,
          compareAtInCents: yearlyCompareAtInCents,
          isActive: true,
        },
      }),
      ...defaultUsageRules.map((rule) =>
        prisma.subscriptionPlanUsageRule.upsert({
          where: {
            subscriptionPlanId_metric: {
              subscriptionPlanId: subscriptionPlan.id,
              metric: rule.metric,
            },
          },
          update: {
            freeCount: rule.freeCount,
            unitPriceInCents: rule.unitPriceInCents,
            isActive: true,
          },
          create: {
            subscriptionPlanId: subscriptionPlan.id,
            metric: rule.metric,
            freeCount: rule.freeCount,
            unitPriceInCents: rule.unitPriceInCents,
            isActive: true,
          },
        }),
      ),
      ...defaultDiscountTiers.map((tier) =>
        prisma.subscriptionPlanDiscountTier.upsert({
          where: {
            subscriptionPlanId_metric_thresholdCount: {
              subscriptionPlanId: subscriptionPlan.id,
              metric: tier.metric,
              thresholdCount: tier.thresholdCount,
            },
          },
          update: {
            discountPercent: tier.discountPercent,
            isActive: true,
          },
          create: {
            subscriptionPlanId: subscriptionPlan.id,
            metric: tier.metric,
            thresholdCount: tier.thresholdCount,
            discountPercent: tier.discountPercent,
            isActive: true,
          },
        }),
      ),
    ]);

    const systems = await prisma.moduleSystem.findMany({
      where: { code: { in: [...systemCodes] }, isActive: true },
      select: { id: true, code: true },
    });
    const systemIdByCode = new Map(
      systems.map((system) => [system.code, system.id]),
    );

    await prisma.subscriptionPlanSystem.deleteMany({
      where: {
        subscriptionPlanId: subscriptionPlan.id,
        systemId: {
          notIn: systems.map((system) => system.id),
        },
      },
    });

    for (const systemCode of systemCodes) {
      const systemId = systemIdByCode.get(systemCode);
      if (!systemId) continue;

      await prisma.subscriptionPlanSystem.upsert({
        where: {
          subscriptionPlanId_systemId: {
            subscriptionPlanId: subscriptionPlan.id,
            systemId,
          },
        },
        update: { isEnabled: true },
        create: {
          subscriptionPlanId: subscriptionPlan.id,
          systemId,
          isEnabled: true,
        },
      });
    }
  }
}
