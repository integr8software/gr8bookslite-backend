import { CompanyUnitType, MembershipRole, MembershipStatus, type Prisma } from '@prisma/client';
import { EntitlementService } from '../../src/common/access/entitlements/entitlement.service';
import { seedCompanyBankAccountDefaults } from '../../src/modules/maintenance/bank-masterfile/seed/bank-masterfile.seed';
import { seedCompanyChartAccountDefaults } from '../../src/modules/maintenance/chart-of-accounts/seed/chart-of-accounts.seed';
import { StandardDefaultChartAccounts } from '../../src/modules/maintenance/chart-of-accounts/seed/chart-of-accounts-defaults.seed';
import { seedCompanyDefaultAccountDefaults } from '../../src/modules/maintenance/default-account/seed/default-accounts.seed';
import { findSystemAccountGroupOrThrow, SystemAccountGroups } from '../../src/modules/maintenance/chart-of-accounts/utils/system-account-groups.util';
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
  ResponsibilityCenterSeedRecords,
  seedCompanyResponsibilityCenterDefaults,
} from '../../src/modules/maintenance/responsibility-center/seed/responsibility-center.seed';
import { TaxMaintenanceSeedRecords, seedCompanyTaxMaintenanceDefaults } from '../../src/modules/maintenance/tax-maintenance/seed/tax-maintenance.seed';
import { ItemVariationSeedRecords, seedCompanyItemVariationDefaults } from '../../src/modules/maintenance/item-variations/seed/item-variations.seed';
import {
  ItemCategorySeedRecords,
  createItemCategorySeedPathName,
  flattenItemCategorySeedRecords,
  flattenItemCategorySeedPaths,
  seedCompanyItemCategoryDefaults,
} from '../../src/modules/maintenance/item-category/seed/item-category.seed';
import { TermMaintenanceSeedRecords, seedCompanyTermMaintenanceDefaults } from '../../src/modules/maintenance/term-maintenance/seed/term-maintenance.seed';
import {
  WarehouseMaintenanceSeedRecords,
  seedCompanyWarehouseMaintenanceDefaults,
} from '../../src/modules/maintenance/warehouse-maintenance/seed/warehouse-maintenance.seed';
import {
  UnitOfMeasurementSeedRecords,
  seedCompanyUnitOfMeasurementDefaults,
} from '../../src/modules/maintenance/unit-of-measurement/seed/unit-of-measurement.seed';
import type { CompanyBootstrapBackup, CompanyBootstrapHandler, CompanyBootstrapInspection } from './company-bootstrap.types';

const UsableSubscriptionStatuses = EntitlementService.usableCompanySubscriptionStatuses();

type RuntimeCountRow = {
  module_count: bigint;
  sidebar_template_count: bigint;
};

function ok(summary: string, details?: Record<string, unknown>): CompanyBootstrapInspection {
  return { status: 'ok', summary, actions: [], details };
}

function missing(summary: string, actions: string[], details?: Record<string, unknown>): CompanyBootstrapInspection {
  return { status: 'missing', summary, actions, details };
}

function warning(summary: string, details?: Record<string, unknown>): CompanyBootstrapInspection {
  return { status: 'warning', summary, actions: [], details };
}

async function getLatestUsableSubscription(companyId: number, tx: Prisma.TransactionClient) {
  return tx.companySubscription.findFirst({
    where: {
      companyId,
      status: { in: UsableSubscriptionStatuses },
    },
    include: { plan: true },
    orderBy: [{ startsAt: 'desc' }, { createdAt: 'desc' }],
  });
}

async function getPlanRuntimeCounts(subscriptionPlanId: number, tx: Prisma.TransactionClient) {
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

async function backupCounts(key: string, companyId: number, tx: Prisma.TransactionClient): Promise<CompanyBootstrapBackup> {
  const [
    chartAccounts,
    defaultAccounts,
    terms,
    itemVariations,
    itemCategories,
    paymentTypes,
    discounts,
    taxMaintenance,
    responsibilityCenters,
    bankAccounts,
    warehouses,
    transactionNumberSequences,
    formSignatorySetups,
  ] = await Promise.all([
    countForBackup('chart_accounts', tx.chartAccount.count({ where: { companyId } })),
    countForBackup('default_accounts', tx.defaultAccount.count({ where: { companyId } })),
    countForBackup('terms', tx.term.count({ where: { companyId } })),
    countForBackup('item_attributes', tx.itemAttribute.count({ where: { companyId } })),
    countForBackup('item_categories', tx.itemCategory.count({ where: { companyId } })),
    countForBackup('payment_types', tx.paymentType.count({ where: { companyId } })),
    countForBackup('discounts', tx.discount.count({ where: { companyId } })),
    countForBackup('tax_maintenance', tx.taxMaintenance.count({ where: { companyId } })),
    countForBackup('responsibility_centers', tx.responsibilityCenter.count({ where: { companyId } })),
    countForBackup('bank_accounts', tx.bankAccount.count({ where: { companyId } })),
    countForBackup('warehouses', tx.warehouse.count({ where: { companyId } })),
    countForBackup(
      'transaction_number_sequences',
      tx.transactionNumberSequence.count({
        where: { branchUnit: { companyId } },
      }),
    ),
    countForBackup('form_signatory_setups', tx.formSignatorySetup.count({ where: { companyId } })),
  ]);

  return {
    key,
    data: {
      chartAccounts,
      defaultAccounts,
      terms,
      itemVariations,
      itemCategories,
      paymentTypes,
      discounts,
      taxMaintenance,
      responsibilityCenters,
      bankAccounts,
      warehouses,
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

function createExistingItemCategoryPathNames(categories: Array<{ id: bigint; name: string; parentId: bigint | null }>) {
  const categoryById = new Map(categories.map((category) => [category.id.toString(), category]));
  const pathById = new Map<string, string>();

  function resolvePath(category: { id: bigint; name: string; parentId: bigint | null }, visited = new Set<string>()): string {
    const id = category.id.toString();
    const cachedPath = pathById.get(id);

    if (cachedPath) {
      return cachedPath;
    }

    if (visited.has(id)) {
      return createItemCategorySeedPathName([category.name]);
    }

    const parent = category.parentId ? categoryById.get(category.parentId.toString()) : null;
    const path = parent ? `${resolvePath(parent, new Set([...visited, id]))}/${category.name}` : createItemCategorySeedPathName([category.name]);

    pathById.set(id, path);
    return path;
  }

  return new Set(categories.map((category) => resolvePath(category)));
}

export const CompanyBootstrapHandlers: CompanyBootstrapHandler[] = [
  {
    key: 'subscription-plan',
    label: 'Subscription plan validity audit',
    async inspect(companyId, tx) {
      const subscription = await getLatestUsableSubscription(companyId, tx);

      if (!subscription) {
        return missing('No usable company subscription found.', ['Assign the company to a valid subscription plan.']);
      }

      const counts = await getPlanRuntimeCounts(subscription.subscriptionPlanId, tx);
      if (counts.moduleCount === 0 || counts.sidebarTemplateCount === 0) {
        return missing(`Subscription plan ${subscription.plan.code} is missing runtime metadata.`, ['Repair the subscription plan/module system mapping.'], {
          subscriptionId: subscription.id,
          planId: subscription.subscriptionPlanId,
          planCode: subscription.plan.code,
          ...counts,
        });
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
        : missing('Active head office is missing.', ['Create HEAD-OFFICE company unit from company profile.']);
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
      const adminsWithoutUnitAccess = adminMemberships.filter((membership) => membership.unitAccess.length === 0);

      if (!headOffice) {
        return warning('Cannot verify admin branch access without head office.');
      }

      if (adminMemberships.length === 0) {
        return warning('No active admin memberships found.');
      }

      if (adminsWithoutUnitAccess.length > 0) {
        return warning('Some active admins have no unit access.', {
          adminUserIdsWithoutUnitAccess: adminsWithoutUnitAccess.map((membership) => membership.userId),
        });
      }

      return ok('Active admin memberships have unit access.', {
        adminCount: adminMemberships.length,
      });
    },
  },
  {
    key: 'warehouses',
    label: 'Warehouse defaults bootstrap',
    async inspect(companyId, tx) {
      const headOffice = await getHeadOffice(companyId, tx);
      if (!headOffice) {
        return warning('Cannot verify warehouse defaults without an active head office.');
      }

      const existingWarehouses = await tx.warehouse.findMany({
        where: {
          companyId,
          deletedAt: null,
          OR: [
            {
              code: {
                in: WarehouseMaintenanceSeedRecords.map((warehouse) => warehouse.code),
              },
            },
            {
              name: {
                in: WarehouseMaintenanceSeedRecords.map((warehouse) => warehouse.name),
              },
            },
          ],
        },
        select: {
          code: true,
          name: true,
          branches: {
            where: { unitId: headOffice.id },
            select: { unitId: true },
          },
        },
      });
      const existingCodes = new Set(existingWarehouses.map((warehouse) => warehouse.code));
      const existingNames = new Set(existingWarehouses.map((warehouse) => warehouse.name));
      const missingWarehouses = WarehouseMaintenanceSeedRecords.filter((warehouse) => !existingCodes.has(warehouse.code) && !existingNames.has(warehouse.name));
      const hasHeadOfficeLink = existingWarehouses.some((warehouse) => warehouse.branches.length > 0);

      if (missingWarehouses.length === 0 && hasHeadOfficeLink) {
        return ok('Warehouse defaults exist.', {
          count: existingWarehouses.length,
        });
      }

      return missing(
        'Warehouse defaults are incomplete.',
        [missingWarehouses.length > 0 ? `Seed ${missingWarehouses.length} missing warehouse records.` : 'Link Main Warehouse to the active head office.'],
        {
          count: existingWarehouses.length,
          expectedCount: WarehouseMaintenanceSeedRecords.length,
          missingCodes: missingWarehouses.map((warehouse) => warehouse.code),
          hasHeadOfficeLink,
        },
      );
    },
    backup: (companyId, tx) => backupCounts('warehouses', companyId, tx),
    async apply(companyId, tx) {
      await seedCompanyWarehouseMaintenanceDefaults(tx, companyId);
    },
  },
  {
    key: 'coa',
    label: 'Chart of Accounts bootstrap',
    async inspect(companyId, tx) {
      const existingAccounts = await tx.chartAccount.findMany({
        where: {
          companyId,
          accountCode: {
            in: StandardDefaultChartAccounts.map((account) => account.accountCode),
          },
        },
        select: { accountCode: true },
      });
      const existingAccountCodes = new Set(existingAccounts.map((account) => account.accountCode));
      const missingAccountCodes = StandardDefaultChartAccounts.filter((account) => !existingAccountCodes.has(account.accountCode)).map(
        (account) => account.accountCode,
      );

      return missingAccountCodes.length === 0
        ? ok('Company COA defaults exist.', {
            chartAccountCount: existingAccounts.length,
          })
        : missing('Company COA defaults are incomplete.', [`Seed ${missingAccountCodes.length} missing standard COA rows.`], {
            chartAccountCount: existingAccounts.length,
            expectedCount: StandardDefaultChartAccounts.length,
            missingAccountCodes,
          });
    },
    backup: (companyId, tx) => backupCounts('coa', companyId, tx),
    async apply(companyId, tx) {
      await seedCompanyChartAccountDefaults(tx, companyId);
    },
  },
  {
    key: 'tax-maintenance',
    label: 'Tax maintenance defaults bootstrap',
    async inspect(companyId, tx) {
      const existingTaxes = await tx.taxMaintenance.findMany({
        where: {
          companyId,
          name: {
            in: TaxMaintenanceSeedRecords.map((tax) => tax.name),
          },
        },
        select: { name: true },
      });
      const existingNames = new Set(existingTaxes.map((tax) => tax.name));
      const missingTaxes = TaxMaintenanceSeedRecords.filter((tax) => !existingNames.has(tax.name));

      return missingTaxes.length === 0
        ? ok('Tax maintenance defaults exist.', { count: existingTaxes.length })
        : missing('Tax maintenance defaults are incomplete.', [`Seed ${missingTaxes.length} missing tax maintenance records.`], {
            count: existingTaxes.length,
            expectedCount: TaxMaintenanceSeedRecords.length,
            missingNames: missingTaxes.map((tax) => tax.name),
          });
    },
    backup: (companyId, tx) => backupCounts('tax-maintenance', companyId, tx),
    async apply(companyId, tx) {
      await seedCompanyTaxMaintenanceDefaults(tx, companyId);
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
      const existingNames = new Set(existingDefaultAccounts.map((account) => account.name));
      const missingDefaultAccounts = StandardDefaultAccountTemplates.filter((template) => !existingNames.has(template.name));

      return missingDefaultAccounts.length === 0
        ? ok('Default account records exist.', {
            count: existingDefaultAccounts.length,
          })
        : missing('Default account records are incomplete.', [`Seed ${missingDefaultAccounts.length} missing default account records.`], {
            count: existingDefaultAccounts.length,
            expectedCount: StandardDefaultAccountTemplates.length,
            missingNames: missingDefaultAccounts.map((template) => template.name),
          });
    },
    backup: (companyId, tx) => backupCounts('default-accounts', companyId, tx),
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
      const missingTerms = TermMaintenanceSeedRecords.filter((term) => !existingNames.has(term.name));

      return missingTerms.length === 0
        ? ok('Terms exist.', { count: existingTerms.length })
        : missing('Default terms are incomplete.', [`Seed ${missingTerms.length} missing default term records.`], {
            count: existingTerms.length,
            expectedCount: TermMaintenanceSeedRecords.length,
            missingNames: missingTerms.map((term) => term.name),
          });
    },
    backup: (companyId, tx) => backupCounts('terms', companyId, tx),
    async apply(companyId, tx) {
      await seedCompanyTermMaintenanceDefaults(tx, companyId);
    },
  },
  {
    key: 'item-variations',
    label: 'Item variation defaults bootstrap',
    async inspect(companyId, tx) {
      const existingAttributes = await tx.itemAttribute.findMany({
        where: {
          companyId,
          deletedAt: null,
          name: {
            in: ItemVariationSeedRecords.map((attribute) => attribute.name),
          },
        },
        select: { name: true },
      });
      const existingNames = new Set(existingAttributes.map((attribute) => attribute.name));
      const missingAttributes = ItemVariationSeedRecords.filter((attribute) => !existingNames.has(attribute.name));

      return missingAttributes.length === 0
        ? ok('Item variation defaults exist.', { count: existingAttributes.length })
        : missing('Default item variations are incomplete.', [`Seed ${missingAttributes.length} missing default item variation records.`], {
            count: existingAttributes.length,
            expectedCount: ItemVariationSeedRecords.length,
            missingNames: missingAttributes.map((attribute) => attribute.name),
          });
    },
    backup: (companyId, tx) => backupCounts('item-variations', companyId, tx),
    async apply(companyId, tx) {
      await seedCompanyItemVariationDefaults(tx, companyId);
    },
  },
  {
    key: 'item-categories',
    label: 'Item category defaults bootstrap',
    async inspect(companyId, tx) {
      const seedRecords = flattenItemCategorySeedRecords();
      const seedPaths = flattenItemCategorySeedPaths();
      const existingCategories = await tx.itemCategory.findMany({
        where: {
          companyId,
          deletedAt: null,
        },
        select: { id: true, name: true, parentId: true },
      });
      const existingPathNames = createExistingItemCategoryPathNames(existingCategories);
      const missingCategories = seedPaths.filter((category) => !existingPathNames.has(category.pathName));

      return missingCategories.length === 0
        ? ok('Item category defaults exist.', { count: existingCategories.length })
        : missing(
            'Default item categories are incomplete.',
            [`Seed ${missingCategories.length} missing default item category records with item COA accounts.`],
            {
              count: existingCategories.length,
              rootCount: ItemCategorySeedRecords.length,
              expectedCount: seedRecords.length,
              missingNames: missingCategories.map((category) => category.name),
              missingPaths: missingCategories.map((category) => category.pathName),
            },
          );
    },
    backup: (companyId, tx) => backupCounts('item-categories', companyId, tx),
    async apply(companyId, tx) {
      await seedCompanyItemCategoryDefaults(tx, companyId);
    },
  },
  {
    key: 'unit-of-measurements',
    label: 'Unit of measurement defaults bootstrap',
    async inspect(companyId, tx) {
      const existingUnits = await tx.unitOfMeasurement.findMany({
        where: {
          companyId,
          symbol: {
            in: UnitOfMeasurementSeedRecords.map((unit) => unit.symbol),
          },
        },
        select: { symbol: true },
      });
      const existingSymbols = new Set(existingUnits.map((unit) => unit.symbol));
      const missingUnits = UnitOfMeasurementSeedRecords.filter((unit) => !existingSymbols.has(unit.symbol));

      return missingUnits.length === 0
        ? ok('Unit of measurement defaults exist.', {
            count: existingUnits.length,
          })
        : missing('Default units of measurement are incomplete.', [`Seed ${missingUnits.length} missing default unit of measurement records.`], {
            count: existingUnits.length,
            expectedCount: UnitOfMeasurementSeedRecords.length,
            missingSymbols: missingUnits.map((unit) => unit.symbol),
          });
    },
    backup: (companyId, tx) => backupCounts('unit-of-measurements', companyId, tx),
    async apply(companyId, tx) {
      await seedCompanyUnitOfMeasurementDefaults(tx, companyId);
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
            in: PaymentTypeMaintenanceSeedRecords.map((paymentType) => paymentType.name),
          },
        },
        select: { name: true },
      });
      const existingNames = new Set(existingPaymentTypes.map((paymentType) => paymentType.name));
      const missingPaymentTypes = PaymentTypeMaintenanceSeedRecords.filter((paymentType) => !existingNames.has(paymentType.name));

      return missingPaymentTypes.length === 0
        ? ok('Payment types exist.', { count: existingPaymentTypes.length })
        : missing('Default payment types are incomplete.', [`Seed ${missingPaymentTypes.length} missing default payment type records.`], {
            count: existingPaymentTypes.length,
            expectedCount: PaymentTypeMaintenanceSeedRecords.length,
            missingNames: missingPaymentTypes.map((paymentType) => paymentType.name),
          });
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
            in: DiscountMaintenanceSeedRecords.map((discount) => discount.name),
          },
        },
        select: { name: true },
      });
      const existingNames = new Set(existingDiscounts.map((discount) => discount.name));
      const missingDiscounts = DiscountMaintenanceSeedRecords.filter((discount) => !existingNames.has(discount.name));

      return missingDiscounts.length === 0
        ? ok('Discount defaults exist.', { count: existingDiscounts.length })
        : missing('Default discounts are incomplete.', [`Seed ${missingDiscounts.length} missing default discount records using system COA groups.`], {
            count: existingDiscounts.length,
            expectedCount: DiscountMaintenanceSeedRecords.length,
            missingNames: missingDiscounts.map((discount) => discount.name),
          });
    },
    backup: (companyId, tx) => backupCounts('discounts', companyId, tx),
    async apply(companyId, tx) {
      await seedCompanyDiscountMaintenanceDefaults(tx, companyId);
    },
  },
  {
    key: 'responsibility-centers',
    label: 'Responsibility center defaults bootstrap',
    async inspect(companyId, tx) {
      const existingCenters = await tx.responsibilityCenter.findMany({
        where: {
          companyId,
          code: {
            in: ResponsibilityCenterSeedRecords.map((center) => center.code),
          },
        },
        select: { code: true },
      });
      const existingCodes = new Set(existingCenters.map((center) => center.code));
      const missingCenters = ResponsibilityCenterSeedRecords.filter((center) => !existingCodes.has(center.code));

      return missingCenters.length === 0
        ? ok('Responsibility center defaults exist.', {
            count: existingCenters.length,
          })
        : missing('Default responsibility centers are incomplete.', [`Seed ${missingCenters.length} missing responsibility center records.`], {
            count: existingCenters.length,
            expectedCount: ResponsibilityCenterSeedRecords.length,
            missingCodes: missingCenters.map((center) => center.code),
          });
    },
    backup: (companyId, tx) => backupCounts('responsibility-centers', companyId, tx),
    async apply(companyId, tx) {
      await seedCompanyResponsibilityCenterDefaults(tx, companyId);
    },
  },
  {
    key: 'bank-defaults',
    label: 'Bank masterfile defaults bootstrap',
    async inspect(companyId, tx) {
      const bankCount = await tx.bankAccount.count({ where: { companyId } });
      try {
        await findSystemAccountGroupOrThrow(tx, companyId, SystemAccountGroups.bankMasterfile.cashInBankParent);
      } catch (error: unknown) {
        return warning('Cash in Bank parent group is missing.', {
          error: error instanceof Error ? error.message : String(error),
        });
      }

      return bankCount > 0
        ? ok('Bank masterfile records exist.', { bankCount })
        : missing('No bank masterfile defaults found.', ['Create default bank records from Cash in Bank COA rows.'], { bankCount });
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
              in: [CompanyUnitType.HEAD_OFFICE, CompanyUnitType.BRANCH, CompanyUnitType.SATELLITE],
            },
          },
        }),
      ]);

      if (sequenceCount === 0 && branchCount > 0) {
        return warning('No transaction number sequences found. No safe default helper exists yet.', { sequenceCount, branchCount });
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
        : warning('No form signatory setups found. No safe default helper exists yet.', { setupCount });
    },
  },
  {
    key: 'sidebar-runtime',
    label: 'Runtime sidebar readiness audit',
    async inspect(companyId, tx) {
      const subscription = await getLatestUsableSubscription(companyId, tx);
      if (!subscription) {
        return missing('Cannot build sidebar without usable subscription.', ['Assign the company to a valid subscription plan.']);
      }

      const counts = await getPlanRuntimeCounts(subscription.subscriptionPlanId, tx);
      if (counts.moduleCount === 0 || counts.sidebarTemplateCount === 0) {
        return missing('Runtime sidebar metadata is incomplete.', ['Repair plan/module-system/sidebar template metadata.'], {
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

export function getCompanyBootstrapHandlers(params: { only?: string[]; skip?: string[] }): CompanyBootstrapHandler[] {
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
