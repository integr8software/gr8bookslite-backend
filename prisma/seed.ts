import { assertLocalDatabase } from './scripts/assertLocalDatabase';
import { runSeedTask } from './scripts/runSeedTask';
import { seedLocalFixtures } from './seeds/seedLocalFixtures';
import { seedSubscriptionPlans } from './seeds/seedSubscriptionPlans';

void runSeedTask('Local Prisma seed', async () => {
  assertLocalDatabase();
  await seedSubscriptionPlans();
  await seedLocalFixtures();
});
