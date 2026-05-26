import { Prisma, SubscriptionPlan } from '@prisma/client';
import { formatPhpAmount } from '../utils/Pricing.util';

type OnboardingSubscriptionPlanRecord = Prisma.SubscriptionPlanGetPayload<{
  include: {
    prices: true;
    usageRules: true;
    discountTiers: true;
    modules: true;
  };
}>;

export function mapSubscriptionPlan(
  plan: SubscriptionPlan | OnboardingSubscriptionPlanRecord,
) {
  const prices = 'prices' in plan ? plan.prices : [];
  const usageRules = 'usageRules' in plan ? plan.usageRules : [];
  const discountTiers = 'discountTiers' in plan ? plan.discountTiers : [];
  const modules = 'modules' in plan ? plan.modules : [];

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
    prices: prices.map((price) => ({
      id: price.id,
      billingCycle: price.billingCycle,
      intervalCount: price.intervalCount,
      intervalUnit: price.intervalUnit,
      amountInCents: price.priceInCents,
      display: formatPhpAmount(price.priceInCents),
      compareAtInCents: price.compareAtInCents,
      compareAtDisplay: price.compareAtInCents
        ? formatPhpAmount(price.compareAtInCents)
        : null,
      isActive: price.isActive,
    })),
    usageRules: usageRules.map((rule) => ({
      id: rule.id,
      metric: rule.metric,
      freeCount: rule.freeCount,
      unitPriceInCents: rule.unitPriceInCents,
      unitPriceDisplay: formatPhpAmount(rule.unitPriceInCents),
      isActive: rule.isActive,
    })),
    discountTiers: discountTiers.map((tier) => ({
      id: tier.id,
      metric: tier.metric,
      thresholdCount: tier.thresholdCount,
      discountPercent: tier.discountPercent.toNumber(),
      isActive: tier.isActive,
    })),
    moduleKeys: modules
      .filter((module) => module.isEnabled)
      .map((module) => module.moduleKey),
    modules: modules.map((module) => ({
      id: module.id,
      moduleKey: module.moduleKey,
      isEnabled: module.isEnabled,
    })),
  };
}
