import { BillingCycle } from '@prisma/client';

type SubscriptionPlanPriceLike = {
  billingCycle: BillingCycle;
  priceInCents: number;
  compareAtInCents: number | null;
  externalPlanId?: string | null;
};

export function getSubscriptionPlanPriceByCycle(prices: SubscriptionPlanPriceLike[], billingCycle: BillingCycle) {
  return prices.find((price) => price.billingCycle === billingCycle) ?? null;
}

export function getSubscriptionPlanPriceSummary(prices: SubscriptionPlanPriceLike[]) {
  const monthly = getSubscriptionPlanPriceByCycle(prices, BillingCycle.MONTHLY);
  const yearly = getSubscriptionPlanPriceByCycle(prices, BillingCycle.YEARLY);

  return {
    monthly,
    yearly,
    monthlyPriceInCents: monthly?.priceInCents ?? 0,
    yearlyPriceInCents: yearly?.priceInCents ?? 0,
    monthlyCompareAtInCents: monthly?.compareAtInCents ?? null,
    yearlyCompareAtInCents: yearly?.compareAtInCents ?? null,
    isMonthlyRemoteReady: Boolean(monthly?.externalPlanId),
    isYearlyRemoteReady: Boolean(yearly?.externalPlanId),
  };
}
