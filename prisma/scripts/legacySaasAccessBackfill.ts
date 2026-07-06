import {
  BillingCycle,
  CompanyStatus,
  Prisma,
  SubscriptionPlanScope,
  SubscriptionPlanStatus,
  SubscriptionStatus,
} from '@prisma/client';
import { EntitlementService } from '../../src/common/access/entitlements/entitlement.service';

export const DefaultLegacySaasPlanCode = 'ACCOUNTING_TRADING';

export type LegacySaasAccessIssue =
  | 'NO_USABLE_SUBSCRIPTION'
  | 'PLAN_HAS_NO_MODULES'
  | 'PLAN_HAS_NO_SIDEBAR_TEMPLATE'
  | 'NO_ACTIVE_BRANCH_UNITS';

export type LegacySaasAccessAuditRow = {
  companyId: number;
  companyName: string;
  subscriptionId: number | null;
  planCode: string | null;
  planModuleCount: number;
  planSidebarItemCount: number;
  activeBranchCount: number;
  issues: LegacySaasAccessIssue[];
};

type LegacySaasAccessClient = Pick<
  Prisma.TransactionClient,
  'company' | 'companySubscription' | 'subscriptionPlan'
>;

const UsableSubscriptionStatuses =
  EntitlementService.usableCompanySubscriptionStatuses();

export function getOptionValue(flag: string) {
  const index = process.argv.findIndex((value) => value === flag);

  if (index === -1) {
    return null;
  }

  return process.argv[index + 1] ?? null;
}

export function getLegacySaasDefaultPlanCode() {
  return (
    getOptionValue('--plan-code') ??
    process.env.LEGACY_SAAS_DEFAULT_PLAN_CODE ??
    DefaultLegacySaasPlanCode
  );
}

export function shouldApplyLegacySaasBackfill() {
  return (
    process.argv.includes('--apply') ||
    process.env.LEGACY_SAAS_ACCESS_BACKFILL_APPLY === 'true'
  );
}

export async function getBackfillSubscriptionPlan(
  client: LegacySaasAccessClient,
  planCode: string,
) {
  const plan = await client.subscriptionPlan.findUnique({
    where: { code: planCode },
    include: {
      prices: {
        where: { isActive: true },
        orderBy: [{ billingCycle: 'asc' }, { id: 'asc' }],
      },
      systems: {
        where: { isEnabled: true, system: { isActive: true } },
        include: {
          system: {
            include: {
              modules: {
                where: { isActive: true, module: { isActive: true } },
                select: { moduleId: true },
              },
              sidebarItems: {
                where: { isVisible: true },
                select: { id: true },
              },
            },
          },
        },
      },
    },
  });

  if (
    !plan ||
    !plan.isActive ||
    plan.status !== SubscriptionPlanStatus.ACTIVE ||
    plan.scope !== SubscriptionPlanScope.ONBOARDING
  ) {
    throw new Error(
      `Backfill plan "${planCode}" must be an active ONBOARDING subscription plan.`,
    );
  }

  const moduleCount = countPlanModules(plan.systems);

  if (moduleCount === 0) {
    throw new Error(
      `Backfill plan "${planCode}" has no active module-system modules. Run platform provisioning before backfill.`,
    );
  }

  const sidebarItemCount = plan.systems.reduce(
    (sum, item) => sum + item.system.sidebarItems.length,
    0,
  );

  if (sidebarItemCount === 0) {
    throw new Error(
      `Backfill plan "${planCode}" has no sidebar templates. Run platform provisioning before backfill.`,
    );
  }

  return {
    plan,
    moduleCount,
    sidebarItemCount,
  };
}

export async function collectLegacySaasAccessAudit(
  client: LegacySaasAccessClient,
): Promise<LegacySaasAccessAuditRow[]> {
  const companies = await client.company.findMany({
    where: {
      isActive: true,
      status: {
        notIn: [CompanyStatus.SUSPENDED, CompanyStatus.FAILED],
      },
    },
    include: {
      subscriptions: {
        where: {
          status: {
            in: UsableSubscriptionStatuses,
          },
        },
        include: {
          plan: {
            include: {
              systems: {
                where: { isEnabled: true, system: { isActive: true } },
                include: {
                  system: {
                    include: {
                      modules: {
                        where: {
                          isActive: true,
                          module: { isActive: true },
                        },
                        select: { moduleId: true },
                      },
                      sidebarItems: {
                        where: { isVisible: true },
                        select: { id: true },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: [{ startsAt: 'desc' }, { createdAt: 'desc' }],
        take: 1,
      },
      units: {
        where: { isActive: true },
        select: { id: true },
        orderBy: { id: 'asc' },
      },
    },
    orderBy: { id: 'asc' },
  });

  const rows: LegacySaasAccessAuditRow[] = [];

  for (const company of companies) {
    const subscription = company.subscriptions[0] ?? null;
    const planModuleCount = subscription
      ? countPlanModules(subscription.plan.systems)
      : 0;
    const planSidebarItemCount =
      subscription?.plan.systems.reduce(
        (sum, item) => sum + item.system.sidebarItems.length,
        0,
      ) ?? 0;
    const companyIssues = getCompanyIssues({
      hasSubscription: Boolean(subscription),
      planModuleCount,
      planSidebarItemCount,
      activeBranchCount: company.units.length,
    });

    rows.push({
      companyId: company.id,
      companyName: company.name,
      subscriptionId: subscription?.id ?? null,
      planCode: subscription?.plan.code ?? null,
      planModuleCount,
      planSidebarItemCount,
      activeBranchCount: company.units.length,
      issues: companyIssues,
    });
  }

  return rows;
}

export function getRowsWithLegacySaasAccessIssues(
  rows: LegacySaasAccessAuditRow[],
) {
  return rows.filter((row) => row.issues.length > 0);
}

export function getTrialEndDate(trialDays: number) {
  if (trialDays <= 0) {
    return null;
  }

  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + trialDays);
  return trialEndsAt;
}

export function getPreferredBillingCycle(
  prices: Array<{ billingCycle: BillingCycle }>,
) {
  return (
    prices.find((price) => price.billingCycle === BillingCycle.MONTHLY)
      ?.billingCycle ??
    prices[0]?.billingCycle ??
    BillingCycle.MONTHLY
  );
}

export function getPreferredPlanPriceId(
  prices: Array<{ id: number; billingCycle: BillingCycle }>,
) {
  return (
    prices.find((price) => price.billingCycle === BillingCycle.MONTHLY)?.id ??
    prices[0]?.id ??
    null
  );
}

export function formatAuditRows(rows: LegacySaasAccessAuditRow[]) {
  return rows.map((row) => ({
    companyId: row.companyId,
    companyName: row.companyName,
    planCode: row.planCode ?? '(none)',
    planModules: row.planModuleCount,
    planSidebarItems: row.planSidebarItemCount,
    branches: row.activeBranchCount,
    issues: row.issues.join(', ') || '(none)',
  }));
}

function getCompanyIssues({
  hasSubscription,
  planModuleCount,
  planSidebarItemCount,
  activeBranchCount,
}: {
  hasSubscription: boolean;
  planModuleCount: number;
  planSidebarItemCount: number;
  activeBranchCount: number;
}): LegacySaasAccessIssue[] {
  return [
    ...(!hasSubscription ? (['NO_USABLE_SUBSCRIPTION'] as const) : []),
    ...(hasSubscription && planModuleCount === 0
      ? (['PLAN_HAS_NO_MODULES'] as const)
      : []),
    ...(hasSubscription && planSidebarItemCount === 0
      ? (['PLAN_HAS_NO_SIDEBAR_TEMPLATE'] as const)
      : []),
    ...(activeBranchCount === 0 ? (['NO_ACTIVE_BRANCH_UNITS'] as const) : []),
  ];
}

function countPlanModules(
  systems: Array<{
    system: {
      modules: Array<{ moduleId: number }>;
    };
  }>,
) {
  return new Set(
    systems.flatMap((planSystem) =>
      planSystem.system.modules.map((module) => module.moduleId),
    ),
  ).size;
}

export { SubscriptionStatus };
