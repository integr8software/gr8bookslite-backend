import { prisma } from './prismaClient';

const plans = [
  {
    code: 'ACCOUNTING',
    name: 'Accounting',
    description: 'Accounting plan with a 15-day free trial.',
    monthlyPriceInCents: 39900,
    yearlyPriceInCents: 399000,
    monthlyCompareAtInCents: 49900,
    yearlyCompareAtInCents: 478800,
    trialDays: 15,
  },
  {
    code: 'ACCOUNTING_INVENTORY',
    name: 'Accounting & Inventory',
    description: 'Accounting and inventory plan with a 15-day free trial.',
    monthlyPriceInCents: 49900,
    yearlyPriceInCents: 499000,
    monthlyCompareAtInCents: 59900,
    yearlyCompareAtInCents: 598800,
    trialDays: 15,
  },
  {
    code: 'ADDITIONAL_COMPANY',
    name: 'Additional Company',
    description: 'Additional company add-on with a 15-day free trial.',
    monthlyPriceInCents: 10000,
    yearlyPriceInCents: 100000,
    monthlyCompareAtInCents: 12500,
    yearlyCompareAtInCents: 120000,
    trialDays: 15,
  },
] as const;

export async function seedSubscriptionPlans() {
  for (const plan of plans) {
    await prisma.subscriptionPlan.upsert({
      where: {
        code: plan.code,
      },
      update: {
        name: plan.name,
        description: plan.description,
        monthlyPriceInCents: plan.monthlyPriceInCents,
        yearlyPriceInCents: plan.yearlyPriceInCents,
        monthlyCompareAtInCents: plan.monthlyCompareAtInCents,
        yearlyCompareAtInCents: plan.yearlyCompareAtInCents,
        trialDays: plan.trialDays,
        isActive: true,
      },
      create: plan,
    });
  }
}
