import { assertLocalDatabase } from './scripts/assertLocalDatabase';
import { runSeedTask } from './scripts/runSeedTask';
import { seedAddressReferences } from './seeds/seedAddressReferences';
import { seedAlphanumericTaxCodes } from './seeds/seedAlphanumericTaxCodes';
import { seedLocalFixtures } from './seeds/seedLocalFixtures';
import { seedSubscriptionPlans } from './seeds/seedSubscriptionPlans';
import { seedUserSidebars } from './seeds/seedUserSidebars';
import { seedModules } from './seeds/seedModules';

void runSeedTask('Local Prisma seed', async () => {
  assertLocalDatabase();
  await seedAddressReferences();
  await seedAlphanumericTaxCodes();
  await seedModules();
  await seedSubscriptionPlans();
  await seedLocalFixtures();
  await seedUserSidebars();
});
