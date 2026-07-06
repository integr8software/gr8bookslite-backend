import { CompanyStatus, SubscriptionStatus } from '@prisma/client';
import { prisma } from '../seeds/prismaClient';
import {
  collectLegacySaasAccessAudit,
  formatAuditRows,
  getBackfillSubscriptionPlan,
  getLegacySaasDefaultPlanCode,
  getPreferredBillingCycle,
  getPreferredPlanPriceId,
  getRowsWithLegacySaasAccessIssues,
  getTrialEndDate,
  shouldApplyLegacySaasBackfill,
} from './legacySaasAccessBackfill';

async function main() {
  const applyChanges = shouldApplyLegacySaasBackfill();
  const planCode = getLegacySaasDefaultPlanCode();
  const planSummary = await getBackfillSubscriptionPlan(prisma, planCode);
  const auditRows = await collectLegacySaasAccessAudit(prisma);
  const issueRows = getRowsWithLegacySaasAccessIssues(auditRows);

  console.log(
    `Legacy SaaS access backfill (${applyChanges ? 'apply' : 'dry-run'}).`,
  );
  console.log(
    `Default subscription plan: ${planSummary.plan.code} (${planSummary.moduleCount} modules, ${planSummary.sidebarItemCount} sidebar template items).`,
  );
  console.table(formatAuditRows(issueRows));

  if (issueRows.length === 0) {
    console.log('No legacy SaaS access gaps found.');
    return;
  }

  const affectedCompanyIds = [
    ...new Set(issueRows.map((row) => row.companyId)),
  ];

  if (!applyChanges) {
    console.log('');
    console.log(
      `Dry run only. Re-run with --apply to repair ${affectedCompanyIds.length} affected company record(s).`,
    );
    console.log(
      'Repair creates missing subscriptions and remaps legacy subscriptions whose plans have no module-system entitlements.',
    );
    console.log(
      'Use --plan-code <CODE> or LEGACY_SAAS_DEFAULT_PLAN_CODE to choose a different default plan.',
    );
    return;
  }

  let createdSubscriptions = 0;
  let remappedSubscriptions = 0;
  const skippedCompanies: Array<{ companyId: number; reason: string }> = [];

  for (const companyId of affectedCompanyIds) {
    const result = await prisma.$transaction(async (tx) => {
      const company = await tx.company.findFirst({
        where: {
          id: companyId,
          isActive: true,
          status: {
            notIn: [CompanyStatus.SUSPENDED, CompanyStatus.FAILED],
          },
        },
        include: {
          subscriptions: {
            where: {
              status: {
                in: [
                  SubscriptionStatus.INCOMPLETE,
                  SubscriptionStatus.TRIALING,
                  SubscriptionStatus.ACTIVE,
                  SubscriptionStatus.PAST_DUE,
                  SubscriptionStatus.UNPAID,
                ],
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
      });

      if (!company) {
        return {
          createdSubscription: false,
          remappedSubscription: false,
          skippedReason: 'Company is inactive or unavailable.',
        };
      }

      if (company.units.length === 0) {
        return {
          createdSubscription: false,
          remappedSubscription: false,
          skippedReason: 'Company has no active branch/unit records.',
        };
      }

      const latestSubscription = company.subscriptions[0] ?? null;
      let createdSubscription = false;
      let remappedSubscription = false;

      if (!latestSubscription) {
        await tx.companySubscription.create({
          data: {
            companyId: company.id,
            subscriptionPlanId: planSummary.plan.id,
            subscriptionPlanPriceId: getPreferredPlanPriceId(
              planSummary.plan.prices,
            ),
            billingCycle: getPreferredBillingCycle(planSummary.plan.prices),
            billingProvider: planSummary.plan.billingProvider,
            status: SubscriptionStatus.TRIALING,
            startsAt: new Date(),
            trialEndsAt: getTrialEndDate(planSummary.plan.trialDays),
          },
        });
        createdSubscription = true;
      } else if (subscriptionPlanNeedsRemap(latestSubscription)) {
        await tx.companySubscription.update({
          where: { id: latestSubscription.id },
          data: {
            subscriptionPlanId: planSummary.plan.id,
            subscriptionPlanPriceId: getPreferredPlanPriceId(
              planSummary.plan.prices,
            ),
            billingCycle: getPreferredBillingCycle(planSummary.plan.prices),
            billingProvider: planSummary.plan.billingProvider,
          },
        });
        remappedSubscription = true;
      }

      return {
        createdSubscription,
        remappedSubscription,
        skippedReason: null,
      };
    });

    if (result.createdSubscription) {
      createdSubscriptions += 1;
    }
    if (result.remappedSubscription) {
      remappedSubscriptions += 1;
    }
    if (result.skippedReason) {
      skippedCompanies.push({ companyId, reason: result.skippedReason });
    }
  }

  console.log(
    JSON.stringify(
      {
        affectedCompanies: affectedCompanyIds.length,
        createdSubscriptions,
        remappedSubscriptions,
        skippedCompanies,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error: unknown) => {
    console.error('Failed to backfill legacy SaaS access.');
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

function subscriptionPlanNeedsRemap(subscription: {
  plan: {
    systems: Array<{
      system: {
        modules: Array<{ moduleId: number }>;
        sidebarItems: Array<{ id: number }>;
      };
    }>;
  };
}) {
  const moduleIds = new Set(
    subscription.plan.systems.flatMap((planSystem) =>
      planSystem.system.modules.map((module) => module.moduleId),
    ),
  );
  const sidebarItemCount = subscription.plan.systems.reduce(
    (sum, planSystem) => sum + planSystem.system.sidebarItems.length,
    0,
  );

  return moduleIds.size === 0 || sidebarItemCount === 0;
}
