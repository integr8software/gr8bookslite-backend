import { seedLocalFixtures } from '../seeds/seedLocalFixtures';
import { assertLocalDatabase } from './assertLocalDatabase';
import { runSeedTask } from './runSeedTask';

void runSeedTask('Local fixture seed', async () => {
  assertLocalDatabase();
  await seedLocalFixtures();
});
