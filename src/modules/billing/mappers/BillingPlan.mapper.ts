import { SubscriptionPlan } from '@prisma/client';

export function mapBillingPlan(plan: SubscriptionPlan) {
  return {
    code: plan.code,
    name: plan.name,
    description: plan.description,
    currency: plan.currency,
    trialDays: plan.trialDays,
    pricing: {
      monthly: {
        amountInCents: plan.monthlyPriceInCents,
        compareAtInCents: plan.monthlyCompareAtInCents,
        isRemoteReady: Boolean(plan.monthlyExternalPlanId),
      },
      yearly: {
        amountInCents: plan.yearlyPriceInCents,
        compareAtInCents: plan.yearlyCompareAtInCents,
        isRemoteReady: Boolean(plan.yearlyExternalPlanId),
      },
    },
  };
}
