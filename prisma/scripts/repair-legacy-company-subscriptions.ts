import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  BillingProvider,
  BillingCycle,
  CompanyStatus,
  SubscriptionPlanScope,
  SubscriptionPlanStatus,
  SubscriptionStatus,
} from '@prisma/client';
import { prisma } from '../seeds/prismaClient';
import { EntitlementService } from '../../src/common/access/entitlements/entitlement.service';

const UsableSubscriptionStatuses =
  EntitlementService.usableCompanySubscriptionStatuses();

type PlanSummary = {
  id: number;
  code: string;
  name: string;
  moduleCount: number;
  sidebarTemplateCount: number;
  billingProvider: BillingProvider;
  trialDays: number;
  priceId: number | null;
  billingCycle: BillingCycle;
};

type RepairCandidate = {
  companyId: number;
  companyName: string;
  subscriptionId: number;
  currentPlanId: number;
  currentPlanCode: string;
  currentPlanName: string;
  currentModuleCount: number;
  currentSidebarTemplateCount: number;
  repairNeeded: boolean;
  targetPlanId: number;
  targetPlanCode: string;
  targetPlanName: string;
};

function getOptionValue(flag: string) {
  const index = process.argv.findIndex((value) => value === flag);

  if (index === -1) {
    return null;
  }

  return process.argv[index + 1] ?? null;
}

function shouldApply() {
  return process.argv.includes('--apply');
}

async function main() {
  const targetPlanCode = getOptionValue('--target-plan-code');
  const apply = shouldApply();

  if (!targetPlanCode) {
    throw new Error(
      'Missing required --target-plan-code <CODE>. Example: --target-plan-code ACCOUNTING_TRADING',
    );
  }

  const targetPlan = await getTargetPlan(targetPlanCode);
  const candidates = await collectRepairCandidates(targetPlan);
  const repairRows = candidates.filter((row) => row.repairNeeded);

  console.log(
    `Legacy company subscription repair (${apply ? 'apply' : 'dry-run'}).`,
  );
  console.log(
    `Target plan: ${targetPlan.id} ${targetPlan.code} (${targetPlan.name})`,
  );
  console.table(
    candidates.map((row) => ({
      companyId: row.companyId,
      companyName: row.companyName,
      subscriptionId: row.subscriptionId,
      currentPlanId: row.currentPlanId,
      currentPlanCode: row.currentPlanCode,
      currentPlanName: row.currentPlanName,
      moduleCount: row.currentModuleCount,
      sidebarTemplateCount: row.currentSidebarTemplateCount,
      repairNeeded: row.repairNeeded,
      targetPlanId: row.targetPlanId,
      targetPlanCode: row.targetPlanCode,
      targetPlanName: row.targetPlanName,
    })),
  );
  console.log(
    JSON.stringify(
      {
        activeCompaniesChecked: candidates.length,
        companiesNeedingRepair: repairRows.length,
        apply,
      },
      null,
      2,
    ),
  );

  if (repairRows.length === 0) {
    console.log('No legacy company subscriptions require repair.');
    return;
  }

  if (!apply) {
    console.log('');
    console.log(
      `Dry run only. Re-run with --apply to update ${repairRows.length} subscription record(s).`,
    );
    return;
  }

  const backupPath = await writeBackup(repairRows);

  for (const row of repairRows) {
    await prisma.companySubscription.update({
      where: { id: row.subscriptionId },
      data: {
        subscriptionPlanId: targetPlan.id,
        subscriptionPlanPriceId: targetPlan.priceId,
        billingCycle: targetPlan.billingCycle,
        billingProvider: targetPlan.billingProvider,
      },
    });
  }

  console.log(
    JSON.stringify(
      {
        updatedSubscriptions: repairRows.length,
        backupPath,
      },
      null,
      2,
    ),
  );
}

async function getTargetPlan(planCode: string): Promise<PlanSummary> {
  const plan = await prisma.subscriptionPlan.findUnique({
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

  if (!plan) {
    throw new Error(`Target plan "${planCode}" was not found.`);
  }
  if (
    !plan.isActive ||
    plan.status !== SubscriptionPlanStatus.ACTIVE ||
    plan.scope !== SubscriptionPlanScope.ONBOARDING
  ) {
    throw new Error(
      `Target plan "${planCode}" must be an active ONBOARDING subscription plan.`,
    );
  }

  const summary = summarizePlan({
    id: plan.id,
    code: plan.code,
    name: plan.name,
    billingProvider: plan.billingProvider,
    trialDays: plan.trialDays,
    prices: plan.prices,
    systems: plan.systems,
  });

  if (summary.moduleCount === 0) {
    throw new Error(
      `Target plan "${planCode}" has no active module-system modules.`,
    );
  }
  if (summary.sidebarTemplateCount === 0) {
    throw new Error(
      `Target plan "${planCode}" has no active sidebar template items.`,
    );
  }

  return summary;
}

async function collectRepairCandidates(
  targetPlan: PlanSummary,
): Promise<RepairCandidate[]> {
  const companies = await prisma.company.findMany({
    where: {
      isActive: true,
      status: {
        notIn: [CompanyStatus.SUSPENDED, CompanyStatus.FAILED],
      },
      subscriptions: {
        some: {
          status: {
            in: UsableSubscriptionStatuses,
          },
        },
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
    },
    orderBy: { id: 'asc' },
  });

  return companies.flatMap((company): RepairCandidate[] => {
    const subscription = company.subscriptions[0];

    if (!subscription) {
      return [];
    }

    const currentPlan = summarizePlan({
      id: subscription.plan.id,
      code: subscription.plan.code,
      name: subscription.plan.name,
      billingProvider: subscription.plan.billingProvider,
      trialDays: subscription.plan.trialDays,
      prices: subscription.plan.prices,
      systems: subscription.plan.systems,
    });
    const repairNeeded =
      currentPlan.moduleCount === 0 ||
      currentPlan.sidebarTemplateCount === 0;

    return [
      {
        companyId: company.id,
        companyName: company.name,
        subscriptionId: subscription.id,
        currentPlanId: currentPlan.id,
        currentPlanCode: currentPlan.code,
        currentPlanName: currentPlan.name,
        currentModuleCount: currentPlan.moduleCount,
        currentSidebarTemplateCount: currentPlan.sidebarTemplateCount,
        repairNeeded,
        targetPlanId: targetPlan.id,
        targetPlanCode: targetPlan.code,
        targetPlanName: targetPlan.name,
      },
    ];
  });
}

function summarizePlan(plan: {
  id: number;
  code: string;
  name: string;
  billingProvider: BillingProvider;
  trialDays: number;
  prices: Array<{ id: number; billingCycle: BillingCycle }>;
  systems: Array<{
    system: {
      modules: Array<{ moduleId: number }>;
      sidebarItems: Array<{ id: number }>;
    };
  }>;
}): PlanSummary {
  const moduleIds = new Set(
    plan.systems.flatMap((system) =>
      system.system.modules.map((module) => module.moduleId),
    ),
  );
  const sidebarTemplateCount = plan.systems.reduce(
    (sum, system) => sum + system.system.sidebarItems.length,
    0,
  );
  const preferredPrice = getPreferredPlanPrice(plan.prices);

  return {
    id: plan.id,
    code: plan.code,
    name: plan.name,
    moduleCount: moduleIds.size,
    sidebarTemplateCount,
    billingProvider: plan.billingProvider,
    trialDays: plan.trialDays,
    priceId: preferredPrice?.id ?? null,
    billingCycle: preferredPrice?.billingCycle ?? BillingCycle.MONTHLY,
  };
}

function getPreferredPlanPrice(
  prices: Array<{ id: number; billingCycle: BillingCycle }>,
) {
  return (
    prices.find((price) => price.billingCycle === BillingCycle.MONTHLY) ??
    prices[0] ??
    null
  );
}

async function writeBackup(rows: RepairCandidate[]) {
  const timestamp = new Date().toISOString();
  const safeTimestamp = timestamp.replace(/[:.]/g, '-');
  const backupDirectory = path.resolve(process.cwd(), 'tmp', 'backups');
  const backupPath = path.join(
    backupDirectory,
    `legacy-company-subscription-repair-${safeTimestamp}.json`,
  );

  await mkdir(backupDirectory, { recursive: true });
  await writeFile(
    backupPath,
    JSON.stringify(
      {
        timestamp,
        rows: rows.map((row) => ({
          companyId: row.companyId,
          companyName: row.companyName,
          subscriptionId: row.subscriptionId,
          oldPlanId: row.currentPlanId,
          oldPlanCode: row.currentPlanCode,
          newPlanId: row.targetPlanId,
          newPlanCode: row.targetPlanCode,
        })),
      },
      null,
      2,
    ),
  );

  return backupPath;
}

main()
  .catch((error: unknown) => {
    console.error('Failed to repair legacy company subscriptions.');
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
