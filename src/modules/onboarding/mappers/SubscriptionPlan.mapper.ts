import { Prisma, SubscriptionPlan } from '@prisma/client';
import { getSubscriptionPlanPriceSummary } from '../../../common/utils/SubscriptionPlanPricing.util';
import { formatPhpAmount } from '../utils/Pricing.util';

type OnboardingSubscriptionPlanRecord = Prisma.SubscriptionPlanGetPayload<{
  include: {
    prices: true;
    usageRules: true;
    discountTiers: true;
    modules: {
      include: { module: true };
    };
    systems: {
      include: {
        system: {
          include: {
            modules: {
              include: { module: true };
            };
          };
        };
      };
    };
  };
}>;

export function mapSubscriptionPlan(plan: SubscriptionPlan | OnboardingSubscriptionPlanRecord) {
  const prices = 'prices' in plan ? plan.prices : [];
  const priceSummary = getSubscriptionPlanPriceSummary(prices);
  const usageRules = 'usageRules' in plan ? plan.usageRules : [];
  const discountTiers = 'discountTiers' in plan ? plan.discountTiers : [];
  const modules = deriveModules(plan);

  return {
    code: plan.code,
    name: plan.name,
    description: plan.description,
    trialDays: plan.trialDays,
    pricing: {
      currency: 'PHP',
      monthly: {
        amountInCents: priceSummary.monthlyPriceInCents,
        display: formatPhpAmount(priceSummary.monthlyPriceInCents),
      },
      yearly: {
        amountInCents: priceSummary.yearlyPriceInCents,
        display: formatPhpAmount(priceSummary.yearlyPriceInCents),
      },
      monthlyCompareAt: priceSummary.monthlyCompareAtInCents
        ? {
            amountInCents: priceSummary.monthlyCompareAtInCents,
            display: formatPhpAmount(priceSummary.monthlyCompareAtInCents),
          }
        : null,
      yearlyCompareAt: priceSummary.yearlyCompareAtInCents
        ? {
            amountInCents: priceSummary.yearlyCompareAtInCents,
            display: formatPhpAmount(priceSummary.yearlyCompareAtInCents),
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
      compareAtDisplay: price.compareAtInCents ? formatPhpAmount(price.compareAtInCents) : null,
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
    moduleKeys: modules.map((module) => module.code),
    modules: modules.map((module) => ({
      id: module.id,
      moduleKey: module.code,
      name: module.name,
      isEnabled: true,
    })),
  };
}

function deriveModules(plan: SubscriptionPlan | OnboardingSubscriptionPlanRecord) {
  if ('systems' in plan && plan.systems.length > 0) {
    const modulesById = new Map<number, OnboardingSubscriptionPlanRecord['systems'][number]['system']['modules'][number]['module']>();
    for (const planSystem of plan.systems) {
      if (!planSystem.isEnabled || !planSystem.system.isActive) continue;
      for (const systemModule of planSystem.system.modules) {
        modulesById.set(systemModule.module.id, systemModule.module);
      }
    }
    return [...modulesById.values()].sort((left, right) => left.name.localeCompare(right.name) || left.code.localeCompare(right.code));
  }

  return 'modules' in plan
    ? plan.modules.map((module) => ({
        id: module.module.id,
        code: module.module.code,
        name: module.module.name,
      }))
    : [];
}
