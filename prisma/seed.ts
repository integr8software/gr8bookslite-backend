import { assertLocalDatabase } from './scripts/assertLocalDatabase';
import { runSeedTask } from './scripts/runSeedTask';
import { seedAddressReferences } from './seeds/seedAddressReferences';
import { seedAlphanumericTaxCodes } from './seeds/seedAlphanumericTaxCodes';
import { seedLocalFixtures } from './seeds/seedLocalFixtures';
import { seedSubscriptionPlans } from './seeds/seedSubscriptionPlans';
import { seedSuperAdmin } from './seeds/seedSuperAdmin';
import { seedUserSidebars } from './seeds/seedUserSidebars';
import { seedModules } from './seeds/seedModules';
import { seedModuleSystems } from './seeds/seedModuleSystems';

void runSeedTask('Local Prisma seed', async () => {
  assertLocalDatabase();
  await seedSuperAdmin();
  await seedAddressReferences();
  await seedAlphanumericTaxCodes();
  await seedModules();
  await seedModuleSystems();
  await seedSubscriptionPlans();
  await seedLocalFixtures();
  await seedUserSidebars();
});
