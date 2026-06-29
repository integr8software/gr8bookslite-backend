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
    systems: {
      include: {
        system: {
          include: {
            modules: {
              include: { module: true },
              where: { isActive: true, module: { isActive: true } },
              orderBy: [{ sortOrder: 'asc' }, { module: { name: 'asc' } }],
            },
          },
        },
      },
      orderBy: [{ system: { sortOrder: 'asc' } }],
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
    systemCodes: plan.systems
      .filter((system) => system.isEnabled)
      .map((system) => system.system.code),
    systems: plan.systems.map((planSystem) => ({
      id: planSystem.system.id,
      code: planSystem.system.code,
      name: planSystem.system.name,
      description: planSystem.system.description ?? '',
      moduleCount: planSystem.system.modules.length,
      isEnabled: planSystem.isEnabled,
    })),
    moduleKeys: derivePlanModules(plan).map((module) => module.code),
    modules: derivePlanModules(plan).map((module) => ({
      id: module.id,
      moduleKey: module.code,
      name: module.name,
      isEnabled: true,
    })),
    legacyModuleKeys: plan.modules
      .filter((module) => module.isEnabled)
      .map((module) => module.moduleKey),
    createdAt: plan.createdAt,
    updatedAt: plan.updatedAt,
  };
}

function derivePlanModules(plan: MasterPlanAndPackageRecord) {
  const modulesById = new Map<
    number,
    MasterPlanAndPackageRecord['systems'][number]['system']['modules'][number]['module']
  >();

  for (const planSystem of plan.systems) {
    if (!planSystem.isEnabled || !planSystem.system.isActive) continue;
    for (const systemModule of planSystem.system.modules) {
      modulesById.set(systemModule.module.id, systemModule.module);
    }
  }

  return [...modulesById.values()].sort(
    (left, right) =>
      left.name.localeCompare(right.name) || left.code.localeCompare(right.code),
  );
}
