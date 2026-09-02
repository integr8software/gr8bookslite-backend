import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  BillingCycle,
  BillingMode,
  BillingProvider,
  CompanyStatus,
  CompanyUnitType,
  MembershipRole,
  MembershipStatus,
  Prisma,
  SubscriptionStatus,
  SystemRole,
  TaxpayerType,
  UserStatus,
  WarehouseAccessLevel,
  WarehouseAccessPermission,
  WarehouseAccessStatus,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { seedCompanyBankAccountDefaults } from '../../src/modules/maintenance/bank-masterfile/seed/bank-masterfile.seed';
import { seedCompanyChartAccountDefaults } from '../../src/modules/maintenance/chart-of-accounts/seed/chart-of-accounts.seed';
import { seedCompanyDefaultAccountDefaults } from '../../src/modules/maintenance/default-account/seed/default-accounts.seed';
import { seedCompanyDiscountMaintenanceDefaults } from '../../src/modules/maintenance/discount-maintenance/seed/discount-maintenance.seed';
import { seedCompanyItemCategoryDefaults } from '../../src/modules/maintenance/item-category/seed/item-category.seed';
import { seedCompanyItemVariationDefaults } from '../../src/modules/maintenance/item-variations/seed/item-variations.seed';
import { seedCompanyPaymentTypeMaintenanceDefaults } from '../../src/modules/maintenance/payment-type-maintenance/seed/payment-type-maintenance.seed';
import { seedCompanyResponsibilityCenterDefaults } from '../../src/modules/maintenance/responsibility-center/seed/responsibility-center.seed';
import { seedCompanyServicesMaintenanceDefaults } from '../../src/modules/maintenance/services-maintenance/seed/services-maintenance.seed';
import { seedCompanyTermsMaintenanceDefaults } from '../../src/modules/maintenance/terms-maintenance/seed/terms-maintenance.seed';
import { seedCompanyUnitOfMeasurementDefaults } from '../../src/modules/maintenance/unit-of-measurement/seed/unit-of-measurement.seed';
import { seedCompanyWarehouseMaintenanceDefaults } from '../../src/modules/maintenance/warehouse-maintenance/seed/warehouse-maintenance.seed';
import { assertLocalDatabase } from './assertLocalDatabase';
import { runSeedTask } from './runSeedTask';
import { seedModules } from '../seeds/seedModules';
import { seedModuleSystems } from '../seeds/seedModuleSystems';
import { seedSubscriptionPlans } from '../seeds/seedSubscriptionPlans';
import { prisma } from '../seeds/prismaClient';

const DEFAULT_ADMIN_EMAIL = 'admin@gr8books.local';
const DEFAULT_ADMIN_PASSWORD = 'Admin123!';
const DEFAULT_ADMIN_NAME = 'Accounting Inventory Admin';
const DEFAULT_COMPANY_NAME = 'Accounting Inventory Demo Company';
const DEFAULT_PLAN_CODE = 'ACCOUNT_AND_INVENTORY_TRIAL';
const DEFAULT_BILLING_CYCLE = BillingCycle.MONTHLY;

type SeedResult = {
  userId: number;
  email: string;
  password: string;
  companyId: number;
  companyName: string;
  companySlug: string;
  subscriptionId: number;
  planCode: string;
  billingCycle: BillingCycle;
  outputPath: string;
};

function getEnvValue(key: string, fallback: string) {
  return process.env[key]?.trim() || fallback;
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function slugify(value: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return slug || 'accounting-inventory-company';
}

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

async function seedCompanyDefaults(tx: Prisma.TransactionClient, companyId: number) {
  await seedCompanyTermsMaintenanceDefaults(tx, companyId);
  await seedCompanyItemVariationDefaults(tx, companyId);
  await seedCompanyUnitOfMeasurementDefaults(tx, companyId);
  await seedCompanyPaymentTypeMaintenanceDefaults(tx, companyId);
  await seedCompanyChartAccountDefaults(tx, companyId);
  await seedCompanyServicesMaintenanceDefaults(tx, companyId);
  await seedCompanyDefaultAccountDefaults(tx, companyId);
  await seedCompanyItemCategoryDefaults(tx, companyId);
  await seedCompanyDiscountMaintenanceDefaults(tx, companyId);
  await seedCompanyResponsibilityCenterDefaults(tx, companyId);
  await seedCompanyBankAccountDefaults(tx, companyId);
  await seedCompanyWarehouseMaintenanceDefaults(tx, companyId);
}

async function seedAccountingInventoryAdmin(): Promise<SeedResult> {
  const email = normalizeEmail(getEnvValue('ACCOUNTING_INVENTORY_ADMIN_EMAIL', DEFAULT_ADMIN_EMAIL));
  const password = getEnvValue('ACCOUNTING_INVENTORY_ADMIN_PASSWORD', DEFAULT_ADMIN_PASSWORD);
  const name = getEnvValue('ACCOUNTING_INVENTORY_ADMIN_NAME', DEFAULT_ADMIN_NAME);
  const companyName = getEnvValue('ACCOUNTING_INVENTORY_COMPANY_NAME', DEFAULT_COMPANY_NAME);
  const planCode = getEnvValue('ACCOUNTING_INVENTORY_PLAN_CODE', DEFAULT_PLAN_CODE).toUpperCase();
  const billingCycle = getEnvValue('ACCOUNTING_INVENTORY_BILLING_CYCLE', DEFAULT_BILLING_CYCLE).toUpperCase() as BillingCycle;
  const now = new Date();

  if (!Object.values(BillingCycle).includes(billingCycle)) {
    throw new Error(`ACCOUNTING_INVENTORY_BILLING_CYCLE must be one of: ${Object.values(BillingCycle).join(', ')}.`);
  }

  await seedModules();
  await seedModuleSystems();
  await seedSubscriptionPlans();

  const result = await prisma.$transaction(
    async (tx) => {
      const plan = await tx.subscriptionPlan.findUnique({
        where: { code: planCode },
        include: {
          prices: {
            where: { isActive: true },
          },
          systems: {
            where: { isEnabled: true },
            include: {
              system: true,
            },
          },
        },
      });

      if (!plan || !plan.isActive) {
        throw new Error(`Active subscription plan ${planCode} was not found.`);
      }

      const hasAccountingInventorySystem = plan.systems.some(
        (planSystem) => planSystem.system.code === 'ACCOUNTING_AND_INVENTORY' && planSystem.system.isActive,
      );

      if (!hasAccountingInventorySystem) {
        throw new Error(`Subscription plan ${planCode} is not linked to ACCOUNTING_AND_INVENTORY.`);
      }

      const planPrice = plan.prices.find((price) => price.billingCycle === billingCycle);

      if (!planPrice) {
        throw new Error(`Subscription plan ${planCode} has no active ${billingCycle} price.`);
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const user = await tx.user.upsert({
        where: { email },
        update: {
          name,
          passwordHash,
          systemRole: SystemRole.STANDARD,
          status: UserStatus.ACTIVE,
          emailVerifiedAt: now,
        },
        create: {
          email,
          name,
          passwordHash,
          systemRole: SystemRole.STANDARD,
          status: UserStatus.ACTIVE,
          emailVerifiedAt: now,
        },
      });

      const company = await tx.company.upsert({
        where: { slug: slugify(companyName) },
        update: {
          name: companyName,
          legalName: companyName,
          taxpayerType: TaxpayerType.NON_INDIVIDUAL,
          email,
          contactNumber: '09170000000',
          address: 'Local seed address',
          tin: '000-000-000-000',
          countryCode: 'PH',
          baseCurrencyCode: 'PHP',
          reportStartDate: new Date(`${now.getUTCFullYear()}-01-01T00:00:00.000Z`),
          reportEndDate: new Date(`${now.getUTCFullYear()}-12-31T00:00:00.000Z`),
          createdByUserId: user.id,
          isActive: true,
          status: CompanyStatus.ACTIVE,
        },
        create: {
          name: companyName,
          slug: slugify(companyName),
          legalName: companyName,
          taxpayerType: TaxpayerType.NON_INDIVIDUAL,
          email,
          contactNumber: '09170000000',
          address: 'Local seed address',
          tin: '000-000-000-000',
          countryCode: 'PH',
          baseCurrencyCode: 'PHP',
          reportStartDate: new Date(`${now.getUTCFullYear()}-01-01T00:00:00.000Z`),
          reportEndDate: new Date(`${now.getUTCFullYear()}-12-31T00:00:00.000Z`),
          createdByUserId: user.id,
          isActive: true,
          status: CompanyStatus.ACTIVE,
        },
      });

      const headOffice = await tx.companyUnit.upsert({
        where: {
          companyId_code: {
            companyId: company.id,
            code: 'HEAD-OFFICE',
          },
        },
        update: {
          name: 'Head Office',
          type: CompanyUnitType.HEAD_OFFICE,
          tin: company.tin,
          address: company.address,
          contactNumber: company.contactNumber,
          email: company.email,
          isActive: true,
          inheritsCompanyProfile: true,
          canTransactSales: true,
          canHoldInventory: true,
        },
        create: {
          companyId: company.id,
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

      await tx.membership.upsert({
        where: {
          userId_companyId: {
            userId: user.id,
            companyId: company.id,
          },
        },
        update: {
          role: MembershipRole.ADMIN,
          status: MembershipStatus.ACTIVE,
          joinedAt: now,
        },
        create: {
          userId: user.id,
          companyId: company.id,
          role: MembershipRole.ADMIN,
          status: MembershipStatus.ACTIVE,
          joinedAt: now,
        },
      });

      await tx.membershipUnitAccess.upsert({
        where: {
          userId_companyId_unitId: {
            userId: user.id,
            companyId: company.id,
            unitId: headOffice.id,
          },
        },
        update: {},
        create: {
          userId: user.id,
          companyId: company.id,
          unitId: headOffice.id,
        },
      });

      await seedCompanyDefaults(tx, company.id);

      const existingSubscription = await tx.companySubscription.findFirst({
        where: {
          companyId: company.id,
          subscriptionPlanId: plan.id,
          billingCycle,
          status: SubscriptionStatus.TRIALING,
        },
        orderBy: [{ startsAt: 'desc' }, { createdAt: 'desc' }],
      });

      const subscription = existingSubscription
        ? await tx.companySubscription.update({
            where: { id: existingSubscription.id },
            data: {
              subscriptionPlanPriceId: planPrice.id,
              billingMode: BillingMode.MANUAL,
              autoRenew: false,
              billingProvider: BillingProvider.PAYMONGO,
              trialEndsAt: addDays(now, plan.trialDays),
              startsAt: now,
            },
          })
        : await tx.companySubscription.create({
            data: {
              companyId: company.id,
              subscriptionPlanId: plan.id,
              subscriptionPlanPriceId: planPrice.id,
              billingCycle,
              billingMode: BillingMode.MANUAL,
              autoRenew: false,
              billingProvider: BillingProvider.PAYMONGO,
              status: SubscriptionStatus.TRIALING,
              startsAt: now,
              trialEndsAt: addDays(now, plan.trialDays),
            },
          });

      const warehouses = await tx.warehouse.findMany({
        where: {
          companyId: company.id,
          deletedAt: null,
        },
        select: { id: true },
      });

      for (const warehouse of warehouses) {
        await tx.warehouseAccess.upsert({
          where: {
            companyId_warehouseId_userId: {
              companyId: company.id,
              warehouseId: warehouse.id,
              userId: user.id,
            },
          },
          update: {
            accessLevel: WarehouseAccessLevel.MANAGER,
            permissions: Object.values(WarehouseAccessPermission),
            status: WarehouseAccessStatus.ACTIVE,
            updatedByUserId: user.id,
            updatedAt: now,
          },
          create: {
            companyId: company.id,
            warehouseId: warehouse.id,
            userId: user.id,
            accessLevel: WarehouseAccessLevel.MANAGER,
            permissions: Object.values(WarehouseAccessPermission),
            status: WarehouseAccessStatus.ACTIVE,
            createdByUserId: user.id,
          },
        });
      }

      return {
        user,
        company,
        subscription,
      };
    },
    {
      timeout: 120_000,
    },
  );

  const outputPath = path.resolve('tmp/seeds/accounting-inventory-admin-seed.json');
  await mkdir(path.dirname(outputPath), { recursive: true });

  const seedResult: SeedResult = {
    userId: result.user.id,
    email,
    password,
    companyId: result.company.id,
    companyName: result.company.name,
    companySlug: result.company.slug,
    subscriptionId: result.subscription.id,
    planCode,
    billingCycle,
    outputPath,
  };

  await writeFile(
    outputPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        admin: {
          id: seedResult.userId,
          email: seedResult.email,
          password: seedResult.password,
          name,
        },
        company: {
          id: seedResult.companyId,
          name: seedResult.companyName,
          slug: seedResult.companySlug,
        },
        subscription: {
          id: seedResult.subscriptionId,
          planCode: seedResult.planCode,
          billingCycle: seedResult.billingCycle,
        },
      },
      null,
      2,
    ),
  );

  return seedResult;
}

void runSeedTask('Accounting and Inventory admin seed', async () => {
  assertLocalDatabase();
  const result = await seedAccountingInventoryAdmin();

  console.log(`Seeded ${result.email} as admin for ${result.companyName} using ${result.planCode}.`);
  console.log(`Seed output written to ${result.outputPath}`);
});
