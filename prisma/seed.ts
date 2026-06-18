import { assertLocalDatabase } from './scripts/assertLocalDatabase';
import { runSeedTask } from './scripts/runSeedTask';
import { seedAddressReferences } from './seeds/seedAddressReferences';
import { seedLocalFixtures } from './seeds/seedLocalFixtures';
import { seedSubscriptionPlans } from './seeds/seedSubscriptionPlans';

void runSeedTask('Local Prisma seed', async () => {
  assertLocalDatabase();
  await seedAddressReferences();
  await seedSubscriptionPlans();
  await seedLocalFixtures();
});
