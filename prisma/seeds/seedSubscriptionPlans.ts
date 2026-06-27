import { prisma } from './prismaClient';
import { AccountingModuleCodes, InventoryModuleCodes } from './moduleCatalog';

const accountingModuleKeys = AccountingModuleCodes;

const inventoryModuleKeys = InventoryModuleCodes;

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
    moduleKeys: accountingModuleKeys,
    scope: 'ONBOARDING',
    status: 'ACTIVE',
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
    moduleKeys: [...accountingModuleKeys, ...inventoryModuleKeys],
    scope: 'ONBOARDING',
    status: 'ACTIVE',
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
    moduleKeys: accountingModuleKeys,
    scope: 'ADDITIONAL_COMPANY',
    status: 'ACTIVE',
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
    moduleKeys: [...accountingModuleKeys, ...inventoryModuleKeys],
    scope: 'ADDITIONAL_COMPANY',
    status: 'ACTIVE',
    trialDays: 0,
  },
] as const;

const defaultUsageRules = [
  {
    metric: 'USER',
    freeCount: 1,
    unitPriceInCents: 10000,
  },
] as const;

const defaultDiscountTiers = [
  {
    metric: 'BRANCH',
    thresholdCount: 10,
    discountPercent: '5.00',
  },
  {
    metric: 'BRANCH',
    thresholdCount: 25,
    discountPercent: '10.00',
  },
  {
    metric: 'BRANCH',
    thresholdCount: 50,
    discountPercent: '20.00',
  },
] as const;

export async function seedSubscriptionPlans() {
  await prisma.subscriptionPlan.updateMany({
    where: {
      code: 'ADDITIONAL_COMPANY',
    },
    data: {
      isActive: false,
      status: 'INACTIVE',
    },
  });

  for (const plan of plans) {
    const {
      moduleKeys,
      monthlyPriceInCents,
      yearlyPriceInCents,
      monthlyCompareAtInCents,
      yearlyCompareAtInCents,
      ...planData
    } = plan;
    const subscriptionPlan = await prisma.subscriptionPlan.upsert({
      where: {
        code: plan.code,
      },
      update: {
        name: plan.name,
        description: plan.description,
        currency: plan.currency,
        scope: plan.scope,
        status: plan.status,
        trialDays: plan.trialDays,
        isActive: true,
      },
      create: planData,
    });

    await Promise.all([
      prisma.subscriptionPlanPrice.upsert({
        where: {
          subscriptionPlanId_billingCycle: {
            subscriptionPlanId: subscriptionPlan.id,
            billingCycle: 'MONTHLY',
          },
        },
        update: {
          intervalCount: 1,
          intervalUnit: 'MONTH',
          priceInCents: monthlyPriceInCents,
          compareAtInCents: monthlyCompareAtInCents,
          isActive: true,
        },
        create: {
          subscriptionPlanId: subscriptionPlan.id,
          billingCycle: 'MONTHLY',
          intervalCount: 1,
          intervalUnit: 'MONTH',
          priceInCents: monthlyPriceInCents,
          compareAtInCents: monthlyCompareAtInCents,
          isActive: true,
        },
      }),
      prisma.subscriptionPlanPrice.upsert({
        where: {
          subscriptionPlanId_billingCycle: {
            subscriptionPlanId: subscriptionPlan.id,
            billingCycle: 'YEARLY',
          },
        },
        update: {
          intervalCount: 1,
          intervalUnit: 'YEAR',
          priceInCents: yearlyPriceInCents,
          compareAtInCents: yearlyCompareAtInCents,
          isActive: true,
        },
        create: {
          subscriptionPlanId: subscriptionPlan.id,
          billingCycle: 'YEARLY',
          intervalCount: 1,
          intervalUnit: 'YEAR',
          priceInCents: yearlyPriceInCents,
          compareAtInCents: yearlyCompareAtInCents,
          isActive: true,
        },
      }),
      ...defaultUsageRules.map((rule) =>
        prisma.subscriptionPlanUsageRule.upsert({
          where: {
            subscriptionPlanId_metric: {
              subscriptionPlanId: subscriptionPlan.id,
              metric: rule.metric,
            },
          },
          update: {
            freeCount: rule.freeCount,
            unitPriceInCents: rule.unitPriceInCents,
            isActive: true,
          },
          create: {
            subscriptionPlanId: subscriptionPlan.id,
            metric: rule.metric,
            freeCount: rule.freeCount,
            unitPriceInCents: rule.unitPriceInCents,
            isActive: true,
          },
        }),
      ),
      ...defaultDiscountTiers.map((tier) =>
        prisma.subscriptionPlanDiscountTier.upsert({
          where: {
            subscriptionPlanId_metric_thresholdCount: {
              subscriptionPlanId: subscriptionPlan.id,
              metric: tier.metric,
              thresholdCount: tier.thresholdCount,
            },
          },
          update: {
            discountPercent: tier.discountPercent,
            isActive: true,
          },
          create: {
            subscriptionPlanId: subscriptionPlan.id,
            metric: tier.metric,
            thresholdCount: tier.thresholdCount,
            discountPercent: tier.discountPercent,
            isActive: true,
          },
        }),
      ),
    ]);

    const enabledModuleKeys = [...new Set(moduleKeys)];

    await prisma.subscriptionPlanModule.updateMany({
      where: {
        subscriptionPlanId: subscriptionPlan.id,
        moduleKey: {
          notIn: enabledModuleKeys,
        },
      },
      data: {
        isEnabled: false,
      },
    });

    await Promise.all(
      enabledModuleKeys.map(async (moduleKey) => {
        const module = await prisma.module.findUnique({ where: { code: moduleKey }, select: { id: true } });
        if (!module) throw new Error(`Subscription plan references missing module code: ${moduleKey}`);
        return prisma.subscriptionPlanModule.upsert({
          where: {
            subscriptionPlanId_moduleKey: {
              subscriptionPlanId: subscriptionPlan.id,
              moduleKey,
            },
          },
          update: {
            isEnabled: true,
          },
          create: {
            subscriptionPlanId: subscriptionPlan.id,
            moduleKey,
            moduleId: module.id,
            isEnabled: true,
          },
        });
      }),
    );
  }
}
