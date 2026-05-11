import { SubscriptionPlan } from '@prisma/client';
import { formatPhpAmount } from '../utils/Pricing.util';

export function mapSubscriptionPlan(plan: SubscriptionPlan) {
  return {
    code: plan.code,
    name: plan.name,
    description: plan.description,
    trialDays: plan.trialDays,
    pricing: {
      currency: 'PHP',
      monthly: {
        amountInCents: plan.monthlyPriceInCents,
        display: formatPhpAmount(plan.monthlyPriceInCents),
      },
      yearly: {
        amountInCents: plan.yearlyPriceInCents,
        display: formatPhpAmount(plan.yearlyPriceInCents),
      },
      monthlyCompareAt: plan.monthlyCompareAtInCents
        ? {
            amountInCents: plan.monthlyCompareAtInCents,
            display: formatPhpAmount(plan.monthlyCompareAtInCents),
          }
        : null,
      yearlyCompareAt: plan.yearlyCompareAtInCents
        ? {
            amountInCents: plan.yearlyCompareAtInCents,
            display: formatPhpAmount(plan.yearlyCompareAtInCents),
          }
        : null,
    },
  };
}
