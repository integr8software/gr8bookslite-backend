import { prisma } from './prismaClient';

const plans = [
  {
    code: 'ACCOUNTING_TRIAL',
    name: 'Accounting (Free Trial)',
    description: '15-day free trial for accounting.',
    currency: 'PHP',
    trialDays: 15,
    trialPriceInCents: 0,
    monthlyPriceInCents: 39900,
    yearlyPriceInCents: 399900,
    monthlyCompareAtInCents: null,
    yearlyCompareAtInCents: null,
    scope: 'ONBOARDING',
    status: 'ACTIVE',
    systemCodes: ['ACCOUNTING'],
  },
  {
    code: 'ACCOUNT_AND_INVENTORY_TRIAL',
    name: 'Accounting and Inventory (Free Trial)',
    description: '15-day free trial for accounting and inventory.',
    currency: 'PHP',
    trialDays: 15,
    trialPriceInCents: 0,
    monthlyPriceInCents: 49900,
    yearlyPriceInCents: 499900,
    monthlyCompareAtInCents: null,
    yearlyCompareAtInCents: null,
    scope: 'ONBOARDING',
    status: 'ACTIVE',
    systemCodes: ['ACCOUNTING_AND_INVENTORY'],
  },
  {
    code: 'REGULAR_PLAN_ACCOUNTING',
    name: 'Accounting',
    description: 'Regular accounting plan with standard 30-day billing.',
    currency: 'PHP',
    trialDays: 0,
    trialPriceInCents: 0,
    monthlyPriceInCents: 39900,
    yearlyPriceInCents: 399900,
    monthlyCompareAtInCents: null,
    yearlyCompareAtInCents: null,
    scope: 'ADDITIONAL_COMPANY',
    status: 'ACTIVE',
    systemCodes: ['ACCOUNTING'],
  },
  {
    code: 'REGULAR_PLAN_ACCOUNTING_AND_INVENTORY',
    name: 'Accounting and Inventory',
    description:
      'Regular accounting and inventory plan with standard 30-day billing.',
    currency: 'PHP',
    trialDays: 0,
    trialPriceInCents: 0,
    monthlyPriceInCents: 49900,
    yearlyPriceInCents: 499900,
    monthlyCompareAtInCents: null,
    yearlyCompareAtInCents: null,
    scope: 'ADDITIONAL_COMPANY',
    status: 'ACTIVE',
    systemCodes: ['ACCOUNTING_AND_INVENTORY'],
  },
] as const;

const activePlanCodes = plans.map((plan) => plan.code);

export async function seedSubscriptionPlans() {
  await prisma.subscriptionPlan.updateMany({
    where: {
      code: { notIn: [...activePlanCodes] },
    },
    data: {
      isActive: false,
      status: 'INACTIVE',
    },
  });

  for (const plan of plans) {
    const { monthlyPriceInCents, yearlyPriceInCents, monthlyCompareAtInCents, yearlyCompareAtInCents, systemCodes, ...planData } = plan;
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
        trialPriceInCents: plan.trialPriceInCents,
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
    ]);

    const systems = await prisma.moduleSystem.findMany({
      where: { code: { in: [...systemCodes] }, isActive: true },
      select: { id: true, code: true },
    });
    const systemIdByCode = new Map(systems.map((system) => [system.code, system.id]));

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
