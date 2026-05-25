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
    trialDays: 15,
  },
  {
    code: 'ACCOUNTING_INVENTORY',
    name: 'Accounting & Inventory',
    description: 'Accounting and inventory plan with a 15-day free trial.',
    currency: 'PHP',
    monthlyPriceInCents: 49900,
    yearlyPriceInCents: 499000,
    monthlyCompareAtInCents: 59900,
    yearlyCompareAtInCents: 598800,
    scope: 'ONBOARDING',
    trialDays: 15,
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
    trialDays: 0,
  },
  {
    code: 'ADDITIONAL_COMPANY_ACCOUNTING_INVENTORY',
    name: 'Accounting & Inventory',
    description:
      'Additional company accounting and inventory plan without a free trial.',
    currency: 'PHP',
    monthlyPriceInCents: 49900,
    yearlyPriceInCents: 499000,
    monthlyCompareAtInCents: 59900,
    yearlyCompareAtInCents: 598800,
    scope: 'ADDITIONAL_COMPANY',
    trialDays: 0,
  },
] as const;

export async function seedSubscriptionPlans() {
  await prisma.subscriptionPlan.updateMany({
    where: {
      code: 'ADDITIONAL_COMPANY',
    },
    data: {
      isActive: false,
    },
  });

  for (const plan of plans) {
    await prisma.subscriptionPlan.upsert({
      where: {
        code: plan.code,
      },
      update: {
        name: plan.name,
        description: plan.description,
        currency: plan.currency,
        monthlyPriceInCents: plan.monthlyPriceInCents,
        yearlyPriceInCents: plan.yearlyPriceInCents,
        monthlyCompareAtInCents: plan.monthlyCompareAtInCents,
        yearlyCompareAtInCents: plan.yearlyCompareAtInCents,
        scope: plan.scope,
        trialDays: plan.trialDays,
        isActive: true,
      },
      create: plan,
    });
  }
}
