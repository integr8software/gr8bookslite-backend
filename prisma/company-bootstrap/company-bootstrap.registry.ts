import {
  CompanyUnitType,
  MembershipRole,
  MembershipStatus,
  type Prisma,
} from '@prisma/client';
import { EntitlementService } from '../../src/common/access/entitlements/entitlement.service';
import { seedCompanyBankAccountDefaults } from '../../src/modules/maintenance/bank-masterfile/seed/bank-masterfile.seed';
import { seedCompanyChartAccountDefaults } from '../../src/modules/maintenance/chart-of-accounts/seed/chart-of-accounts.seed';
import { seedCompanyDefaultAccountDefaults } from '../../src/modules/maintenance/default-account/seed/default-accounts.seed';
import {
  findSystemAccountGroupOrThrow,
  SystemAccountGroups,
} from '../../src/modules/maintenance/chart-of-accounts/utils/system-account-groups.util';
import { StandardDefaultAccountTemplates } from '../../src/modules/maintenance/default-account/seed/default-account-defaults.seed';
import {
  PaymentTypeMaintenanceSeedRecords,
  seedCompanyPaymentTypeMaintenanceDefaults,
} from '../../src/modules/maintenance/payment-type-maintenance/seed/payment-type-maintenance.seed';
import {
  DiscountMaintenanceSeedRecords,
  seedCompanyDiscountMaintenanceDefaults,
} from '../../src/modules/maintenance/discount-maintenance/seed/discount-maintenance.seed';
import {
  TermMaintenanceSeedRecords,
  seedCompanyTermMaintenanceDefaults,
} from '../../src/modules/maintenance/term-maintenance/seed/term-maintenance.seed';
import type {
  CompanyBootstrapBackup,
  CompanyBootstrapHandler,
  CompanyBootstrapInspection,
} from './company-bootstrap.types';

const UsableSubscriptionStatuses =
  EntitlementService.usableCompanySubscriptionStatuses();

type RuntimeCountRow = {
  module_count: bigint;
  sidebar_template_count: bigint;
};

function ok(
  summary: string,
  details?: Record<string, unknown>,
): CompanyBootstrapInspection {
  return { status: 'ok', summary, actions: [], details };
}

function missing(
  summary: string,
  actions: string[],
  details?: Record<string, unknown>,
): CompanyBootstrapInspection {
  return { status: 'missing', summary, actions, details };
}

function warning(
  summary: string,
  details?: Record<string, unknown>,
): CompanyBootstrapInspection {
  return { status: 'warning', summary, actions: [], details };
}

function errorInspection(
  summary: string,
  details?: Record<string, unknown>,
): CompanyBootstrapInspection {
  return { status: 'error', summary, actions: [], details };
}

async function getLatestUsableSubscription(
  companyId: number,
  tx: Prisma.TransactionClient,
) {
  return tx.companySubscription.findFirst({
    where: {
      companyId,
      status: { in: UsableSubscriptionStatuses },
    },
    include: { plan: true },
    orderBy: [{ startsAt: 'desc' }, { createdAt: 'desc' }],
  });
}

async function getPlanRuntimeCounts(
  subscriptionPlanId: number,
  tx: Prisma.TransactionClient,
) {
  const rows = await tx.$queryRaw<RuntimeCountRow[]>`
    SELECT
      COUNT(DISTINCT msm.module_id) AS module_count,
      COUNT(DISTINCT msi.id) AS sidebar_template_count
    FROM subscription_plans sp
    LEFT JOIN subscription_plan_systems sps
      ON sps.subscription_plan_id = sp.id
     AND sps.is_enabled = true
    LEFT JOIN module_systems ms
      ON ms.id = sps.system_id
     AND ms.is_active = true
    LEFT JOIN module_system_modules msm
      ON msm.system_id = ms.id
     AND msm.is_active = true
    LEFT JOIN modules m
      ON m.id = msm.module_id
     AND m.is_active = true
    LEFT JOIN module_system_sidebar msi
      ON msi.system_id = ms.id
     AND msi.is_visible = true
    WHERE sp.id = ${subscriptionPlanId}
      AND sp.is_active = true
  `;

  return {
    moduleCount: Number(rows[0]?.module_count ?? 0n),
    sidebarTemplateCount: Number(rows[0]?.sidebar_template_count ?? 0n),
  };
}

async function getHeadOffice(companyId: number, tx: Prisma.TransactionClient) {
  return tx.companyUnit.findFirst({
    where: {
      companyId,
      type: CompanyUnitType.HEAD_OFFICE,
      isActive: true,
    },
    orderBy: { id: 'asc' },
  });
}

async function backupCounts(
  key: string,
  companyId: number,
  tx: Prisma.TransactionClient,
): Promise<CompanyBootstrapBackup> {
  const [
    chartAccounts,
    defaultAccounts,
    terms,
    paymentTypes,
    discounts,
    bankAccounts,
    transactionNumberSequences,
    formSignatorySetups,
  ] = await Promise.all([
    countForBackup('chart_accounts', tx.chartAccount.count({ where: { companyId } })),
    countForBackup(
      'default_accounts',
      tx.defaultAccount.count({ where: { companyId } }),
    ),
    countForBackup('terms', tx.term.count({ where: { companyId } })),
    countForBackup(
      'payment_types',
      tx.paymentType.count({ where: { companyId } }),
    ),
    countForBackup('discounts', tx.discount.count({ where: { companyId } })),
    countForBackup(
      'bank_accounts',
      tx.bankAccount.count({ where: { companyId } }),
    ),
    countForBackup(
      'transaction_number_sequences',
      tx.transactionNumberSequence.count({
        where: { branchUnit: { companyId } },
      }),
    ),
    countForBackup(
      'form_signatory_setups',
      tx.formSignatorySetup.count({ where: { companyId } }),
    ),
  ]);

  return {
    key,
    data: {
      chartAccounts,
      defaultAccounts,
      terms,
      paymentTypes,
      discounts,
      bankAccounts,
      transactionNumberSequences,
      formSignatorySetups,
    },
  };
}

async function countForBackup(tableName: string, count: Promise<number>) {
  try {
    return await count;
  } catch (error: unknown) {
    return {
      unavailable: true,
      tableName,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export const CompanyBootstrapHandlers: CompanyBootstrapHandler[] = [
  {
    key: 'subscription-plan',
    label: 'Subscription plan validity audit',
    async inspect(companyId, tx) {
      const subscription = await getLatestUsableSubscription(companyId, tx);

      if (!subscription) {
        return missing('No usable company subscription found.', [
          'Assign the company to a valid subscription plan.',
        ]);
      }

      const counts = await getPlanRuntimeCounts(
        subscription.subscriptionPlanId,
        tx,
      );
      if (counts.moduleCount === 0 || counts.sidebarTemplateCount === 0) {
        return missing(
          `Subscription plan ${subscription.plan.code} is missing runtime metadata.`,
          ['Repair the subscription plan/module system mapping.'],
          {
            subscriptionId: subscription.id,
            planId: subscription.subscriptionPlanId,
            planCode: subscription.plan.code,
            ...counts,
          },
        );
      }

      return ok(`Plan ${subscription.plan.code} is runtime-ready.`, {
        subscriptionId: subscription.id,
        planId: subscription.subscriptionPlanId,
        planCode: subscription.plan.code,
        ...counts,
      });
    },
  },
  {
    key: 'head-office',
    label: 'Head office/unit bootstrap',
    async inspect(companyId, tx) {
      const headOffice = await getHeadOffice(companyId, tx);
      return headOffice
        ? ok('Active head office exists.', { unitId: headOffice.id })
        : missing('Active head office is missing.', [
            'Create HEAD-OFFICE company unit from company profile.',
          ]);
    },
    async backup(companyId, tx) {
      const units = await tx.companyUnit.findMany({
        where: { companyId },
        select: { id: true, code: true, name: true, type: true, isActive: true },
        orderBy: { id: 'asc' },
      });
      return { key: 'head-office', data: { units } };
    },
    async apply(companyId, tx) {
      const headOffice = await getHeadOffice(companyId, tx);
      if (headOffice) {
        return;
      }

      const company = await tx.company.findUniqueOrThrow({
        where: { id: companyId },
      });

      await tx.companyUnit.upsert({
        where: {
          companyId_code: {
            companyId,
            code: 'HEAD-OFFICE',
          },
        },
        update: { isActive: true },
        create: {
          companyId,
          type: CompanyUnitType.HEAD_OFFICE,
          code: 'HEAD-OFFICE',
          name: 'Head Office',
          tin: company.tin,
          address: company.address,
          contactNumber: company.contactNumber,
          email: company.email,
          isActive: true,
          inheritsCompanyProfile: true,
          canTransactSales: true,
          canHoldInventory: true,
        },
      });
    },
  },
  {
    key: 'admin-access',
    label: 'Admin membership and branch access audit',
    async inspect(companyId, tx) {
      const headOffice = await getHeadOffice(companyId, tx);
      const adminMemberships = await tx.membership.findMany({
        where: {
          companyId,
          role: MembershipRole.ADMIN,
          status: MembershipStatus.ACTIVE,
        },
        select: {
          userId: true,
          unitAccess: { select: { unitId: true } },
        },
      });
      const adminsWithoutUnitAccess = adminMemberships.filter(
        (membership) => membership.unitAccess.length === 0,
      );

      if (!headOffice) {
        return warning('Cannot verify admin branch access without head office.');
      }

      if (adminMemberships.length === 0) {
        return warning('No active admin memberships found.');
      }

      if (adminsWithoutUnitAccess.length > 0) {
        return warning('Some active admins have no unit access.', {
          adminUserIdsWithoutUnitAccess: adminsWithoutUnitAccess.map(
            (membership) => membership.userId,
          ),
        });
      }

      return ok('Active admin memberships have unit access.', {
        adminCount: adminMemberships.length,
      });
    },
  },
  {
    key: 'coa',
    label: 'Chart of Accounts bootstrap',
    async inspect(companyId, tx) {
      const chartAccountCount = await tx.chartAccount.count({
        where: { companyId },
      });

      return chartAccountCount > 0
        ? ok('Company COA exists.', { chartAccountCount })
        : missing(
            'Company has no chart accounts.',
            ['Seed company COA from system-owned Chart of Accounts seed.'],
            { chartAccountCount },
          );
    },
    backup: (companyId, tx) => backupCounts('coa', companyId, tx),
    async apply(companyId, tx) {
      const chartAccountCount = await tx.chartAccount.count({
        where: { companyId },
      });
      if (chartAccountCount === 0) {
        await seedCompanyChartAccountDefaults(tx, companyId);
      }
    },
  },
  {
    key: 'default-accounts',
    label: 'Default account records bootstrap',
    async inspect(companyId, tx) {
      const existingDefaultAccounts = await tx.defaultAccount.findMany({
        where: {
          companyId,
          name: {
            in: StandardDefaultAccountTemplates.map((template) => template.name),
          },
        },
        select: { name: true },
      });
      const existingNames = new Set(
        existingDefaultAccounts.map((account) => account.name),
      );
      const missingDefaultAccounts = StandardDefaultAccountTemplates.filter(
        (template) => !existingNames.has(template.name),
      );

      return missingDefaultAccounts.length === 0
        ? ok('Default account records exist.', {
            count: existingDefaultAccounts.length,
          })
        : missing(
            'Default account records are incomplete.',
            [
              `Seed ${missingDefaultAccounts.length} missing default account records.`,
            ],
            {
              count: existingDefaultAccounts.length,
              expectedCount: StandardDefaultAccountTemplates.length,
              missingNames: missingDefaultAccounts.map(
                (template) => template.name,
              ),
            },
          );
    },
    backup: (companyId, tx) =>
      backupCounts('default-accounts', companyId, tx),
    async apply(companyId, tx) {
      await seedCompanyDefaultAccountDefaults(tx, companyId);
    },
  },
  {
    key: 'terms',
    label: 'Terms bootstrap',
    async inspect(companyId, tx) {
      const existingTerms = await tx.term.findMany({
        where: {
          companyId,
          name: { in: TermMaintenanceSeedRecords.map((term) => term.name) },
        },
        select: { name: true },
      });
      const existingNames = new Set(existingTerms.map((term) => term.name));
      const missingTerms = TermMaintenanceSeedRecords.filter(
        (term) => !existingNames.has(term.name),
      );

      return missingTerms.length === 0
        ? ok('Terms exist.', { count: existingTerms.length })
        : missing(
            'Default terms are incomplete.',
            [`Seed ${missingTerms.length} missing default term records.`],
            {
              count: existingTerms.length,
              expectedCount: TermMaintenanceSeedRecords.length,
              missingNames: missingTerms.map((term) => term.name),
            },
          );
    },
    backup: (companyId, tx) => backupCounts('terms', companyId, tx),
    async apply(companyId, tx) {
      await seedCompanyTermMaintenanceDefaults(tx, companyId);
    },
  },
  {
    key: 'payment-types',
    label: 'Payment types bootstrap',
    async inspect(companyId, tx) {
      const existingPaymentTypes = await tx.paymentType.findMany({
        where: {
          companyId,
          name: {
            in: PaymentTypeMaintenanceSeedRecords.map(
              (paymentType) => paymentType.name,
            ),
          },
        },
        select: { name: true },
      });
      const existingNames = new Set(
        existingPaymentTypes.map((paymentType) => paymentType.name),
      );
      const missingPaymentTypes = PaymentTypeMaintenanceSeedRecords.filter(
        (paymentType) => !existingNames.has(paymentType.name),
      );

      return missingPaymentTypes.length === 0
        ? ok('Payment types exist.', { count: existingPaymentTypes.length })
        : missing(
            'Default payment types are incomplete.',
            [
              `Seed ${missingPaymentTypes.length} missing default payment type records.`,
            ],
            {
              count: existingPaymentTypes.length,
              expectedCount: PaymentTypeMaintenanceSeedRecords.length,
              missingNames: missingPaymentTypes.map(
                (paymentType) => paymentType.name,
              ),
            },
          );
    },
    backup: (companyId, tx) => backupCounts('payment-types', companyId, tx),
    async apply(companyId, tx) {
      await seedCompanyPaymentTypeMaintenanceDefaults(tx, companyId);
    },
  },
  {
    key: 'discounts',
    label: 'Discount defaults bootstrap',
    async inspect(companyId, tx) {
      const existingDiscounts = await tx.discount.findMany({
        where: {
          companyId,
          name: {
            in: DiscountMaintenanceSeedRecords.map(
              (discount) => discount.name,
            ),
          },
        },
        select: { name: true },
      });
      const existingNames = new Set(
        existingDiscounts.map((discount) => discount.name),
      );
      const missingDiscounts = DiscountMaintenanceSeedRecords.filter(
        (discount) => !existingNames.has(discount.name),
      );

      return missingDiscounts.length === 0
        ? ok('Discount defaults exist.', { count: existingDiscounts.length })
        : missing(
            'Default discounts are incomplete.',
            [
              `Seed ${missingDiscounts.length} missing default discount records using system COA groups.`,
            ],
            {
              count: existingDiscounts.length,
              expectedCount: DiscountMaintenanceSeedRecords.length,
              missingNames: missingDiscounts.map((discount) => discount.name),
            },
          );
    },
    backup: (companyId, tx) => backupCounts('discounts', companyId, tx),
    async apply(companyId, tx) {
      await seedCompanyDiscountMaintenanceDefaults(tx, companyId);
    },
  },
  {
    key: 'bank-defaults',
    label: 'Bank masterfile defaults bootstrap',
    async inspect(companyId, tx) {
      const bankCount = await tx.bankAccount.count({ where: { companyId } });
      try {
        await findSystemAccountGroupOrThrow(
          tx,
          companyId,
          SystemAccountGroups.bankMasterfile.cashInBankParent,
        );
      } catch (error: unknown) {
        return warning('Cash in Bank parent group is missing.', {
          error: error instanceof Error ? error.message : String(error),
        });
      }

      return bankCount > 0
        ? ok('Bank masterfile records exist.', { bankCount })
        : missing(
            'No bank masterfile defaults found.',
            ['Create default bank records from Cash in Bank COA rows.'],
            { bankCount },
          );
    },
    backup: (companyId, tx) => backupCounts('bank-defaults', companyId, tx),
    async apply(companyId, tx) {
      const bankCount = await tx.bankAccount.count({ where: { companyId } });
      if (bankCount === 0) {
        await seedCompanyBankAccountDefaults(tx, companyId);
      }
    },
  },
  {
    key: 'transaction-number-sequences',
    label: 'Transaction number sequences audit',
    async inspect(companyId, tx) {
      const [sequenceCount, branchCount] = await Promise.all([
        tx.transactionNumberSequence.count({
          where: { branchUnit: { companyId } },
        }),
        tx.companyUnit.count({
          where: {
            companyId,
            isActive: true,
            type: {
              in: [
                CompanyUnitType.HEAD_OFFICE,
                CompanyUnitType.BRANCH,
                CompanyUnitType.SATELLITE,
              ],
            },
          },
        }),
      ]);

      if (sequenceCount === 0 && branchCount > 0) {
        return warning(
          'No transaction number sequences found. No safe default helper exists yet.',
          { sequenceCount, branchCount },
        );
      }

      return ok('Transaction number sequence audit completed.', {
        sequenceCount,
        branchCount,
      });
    },
  },
  {
    key: 'form-signatories',
    label: 'Form signatory defaults audit',
    async inspect(companyId, tx) {
      const setupCount = await tx.formSignatorySetup.count({
        where: { companyId },
      });

      return setupCount > 0
        ? ok('Form signatory setups exist.', { setupCount })
        : warning(
            'No form signatory setups found. No safe default helper exists yet.',
            { setupCount },
          );
    },
  },
  {
    key: 'sidebar-runtime',
    label: 'Runtime sidebar readiness audit',
    async inspect(companyId, tx) {
      const subscription = await getLatestUsableSubscription(companyId, tx);
      if (!subscription) {
        return missing('Cannot build sidebar without usable subscription.', [
          'Assign the company to a valid subscription plan.',
        ]);
      }

      const counts = await getPlanRuntimeCounts(
        subscription.subscriptionPlanId,
        tx,
      );
      if (counts.moduleCount === 0 || counts.sidebarTemplateCount === 0) {
        return missing('Runtime sidebar metadata is incomplete.', [
          'Repair plan/module-system/sidebar template metadata.',
        ], {
          planCode: subscription.plan.code,
          ...counts,
        });
      }

      return ok('Runtime sidebar can be derived from plan metadata.', {
        planCode: subscription.plan.code,
        ...counts,
      });
    },
  },
];

export function getCompanyBootstrapHandlers(params: {
  only?: string[];
  skip?: string[];
}): CompanyBootstrapHandler[] {
  const only = new Set(params.only ?? []);
  const skip = new Set(params.skip ?? []);

  return CompanyBootstrapHandlers.filter((handler) => {
    if (only.size > 0 && !only.has(handler.key)) {
      return false;
    }

    return !skip.has(handler.key);
  });
}

export function getCompanyBootstrapHandlerKeys() {
  return CompanyBootstrapHandlers.map((handler) => handler.key);
}
