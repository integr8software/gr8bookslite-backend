import { Prisma } from '@prisma/client';

export const masterPlanAndPackageInclude =
  Prisma.validator<Prisma.SubscriptionPlanInclude>()({
    prices: {
      orderBy: [{ billingCycle: 'asc' }],
    },
    usageRules: {
      orderBy: [{ metric: 'asc' }],
    },
    discountTiers: {
      orderBy: [{ metric: 'asc' }, { thresholdCount: 'asc' }],
    },
    modules: {
      orderBy: [{ moduleKey: 'asc' }],
    },
  });

export type MasterPlanAndPackageRecord = Prisma.SubscriptionPlanGetPayload<{
  include: typeof masterPlanAndPackageInclude;
}>;

export function mapMasterPlanAndPackage(plan: MasterPlanAndPackageRecord) {
  const monthlyPrice = plan.prices.find(
    (price) => price.billingCycle === 'MONTHLY',
  );
  const yearlyPrice = plan.prices.find(
    (price) => price.billingCycle === 'YEARLY',
  );

  return {
    id: plan.id,
    code: plan.code,
    name: plan.name,
    description: plan.description ?? '',
    currency: plan.currency,
    scope: plan.scope,
    status: plan.status,
    trialDays: plan.trialDays,
    isActive: plan.isActive,
    pricing: {
      monthlyBasePriceInCents: monthlyPrice?.priceInCents ?? 0,
      monthlyCompareAtInCents: monthlyPrice?.compareAtInCents ?? null,
      yearlyBasePriceInCents: yearlyPrice?.priceInCents ?? 0,
      yearlyCompareAtInCents: yearlyPrice?.compareAtInCents ?? null,
    },
    prices: plan.prices.map((price) => ({
      id: price.id,
      billingCycle: price.billingCycle,
      intervalCount: price.intervalCount,
      intervalUnit: price.intervalUnit,
      priceInCents: price.priceInCents,
      compareAtInCents: price.compareAtInCents,
      isActive: price.isActive,
    })),
    usageRules: plan.usageRules.map((rule) => ({
      id: rule.id,
      metric: rule.metric,
      freeCount: rule.freeCount,
      unitPriceInCents: rule.unitPriceInCents,
      isActive: rule.isActive,
    })),
    discountTiers: plan.discountTiers.map((tier) => ({
      id: tier.id,
      metric: tier.metric,
      thresholdCount: tier.thresholdCount,
      discountPercent: tier.discountPercent.toNumber(),
      isActive: tier.isActive,
    })),
    moduleKeys: plan.modules
      .filter((module) => module.isEnabled)
      .map((module) => module.moduleKey),
    modules: plan.modules.map((module) => ({
      id: module.id,
      moduleKey: module.moduleKey,
      isEnabled: module.isEnabled,
    })),
    createdAt: plan.createdAt,
    updatedAt: plan.updatedAt,
  };
}
