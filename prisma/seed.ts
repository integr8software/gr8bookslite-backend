import { assertLocalDatabase } from './scripts/assertLocalDatabase';
import { runSeedTask } from './scripts/runSeedTask';
import { seedAddressReferences } from './seeds/seedAddressReferences';
import { seedAlphanumericTaxCodes } from './seeds/seedAlphanumericTaxCodes';
import { seedLocalFixtures } from './seeds/seedLocalFixtures';
import { seedSubscriptionPlans } from './seeds/seedSubscriptionPlans';
import { seedSuperAdmin } from './seeds/seedSuperAdmin';
import { seedModules } from './seeds/seedModules';
import { seedModuleSystems } from './seeds/seedModuleSystems';
import { prisma } from './seeds/prismaClient';
import { seedGlobalTaxDefaults } from '../src/modules/tax/seed/tax.seed';

void runSeedTask('Local Prisma seed', async () => {
  assertLocalDatabase();
  await seedSuperAdmin();
  await seedAddressReferences();
  await seedAlphanumericTaxCodes();
  await seedModules();
  await seedModuleSystems();
  await seedGlobalTaxDefaults(prisma);
  await seedSubscriptionPlans();
  await seedLocalFixtures();
});
