import { Prisma, SubscriptionPlan } from '@prisma/client';
import { getSubscriptionPlanPriceSummary } from '../../../common/utils/SubscriptionPlanPricing.util';

type BillingPlanRecord = Prisma.SubscriptionPlanGetPayload<{
  include: {
    prices: true;
    usageRules: true;
    discountTiers: true;
    modules: true;
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

export function mapBillingPlan(plan: SubscriptionPlan | BillingPlanRecord) {
  const prices = 'prices' in plan ? plan.prices : [];
  const priceSummary = getSubscriptionPlanPriceSummary(prices);
  const usageRules = 'usageRules' in plan ? plan.usageRules : [];
  const discountTiers = 'discountTiers' in plan ? plan.discountTiers : [];
  const modules = deriveModules(plan);

  return {
    code: plan.code,
    name: plan.name,
    description: plan.description,
    currency: plan.currency,
    scope: plan.scope,
    trialDays: plan.trialDays,
    pricing: {
      monthly: {
        amountInCents: priceSummary.monthlyPriceInCents,
        compareAtInCents: priceSummary.monthlyCompareAtInCents,
        isRemoteReady: priceSummary.isMonthlyRemoteReady,
      },
      yearly: {
        amountInCents: priceSummary.yearlyPriceInCents,
        compareAtInCents: priceSummary.yearlyCompareAtInCents,
        isRemoteReady: priceSummary.isYearlyRemoteReady,
      },
    },
    prices: prices.map((price) => ({
      id: price.id,
      billingCycle: price.billingCycle,
      intervalCount: price.intervalCount,
      intervalUnit: price.intervalUnit,
      amountInCents: price.priceInCents,
      compareAtInCents: price.compareAtInCents,
      isRemoteReady: Boolean(price.externalPlanId),
      isActive: price.isActive,
    })),
    usageRules: usageRules.map((rule) => ({
      id: rule.id,
      metric: rule.metric,
      freeCount: rule.freeCount,
      unitPriceInCents: rule.unitPriceInCents,
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
      .map((module) => module.code),
    modules: modules.map((module) => ({
      id: module.id,
      moduleKey: module.code,
      name: module.name,
      isEnabled: true,
    })),
  };
}

function deriveModules(plan: SubscriptionPlan | BillingPlanRecord) {
  if ('systems' in plan && plan.systems.length > 0) {
    const modulesById = new Map<
      number,
      BillingPlanRecord['systems'][number]['system']['modules'][number]['module']
    >();
    for (const planSystem of plan.systems) {
      if (!planSystem.isEnabled || !planSystem.system.isActive) continue;
      for (const systemModule of planSystem.system.modules) {
        modulesById.set(systemModule.module.id, systemModule.module);
      }
    }
    return [...modulesById.values()].sort(
      (left, right) =>
        left.name.localeCompare(right.name) ||
        left.code.localeCompare(right.code),
    );
  }

  return 'modules' in plan
    ? plan.modules.map((module) => ({
        id: module.id,
        code: module.moduleKey,
        name: module.moduleKey,
      }))
    : [];
}
