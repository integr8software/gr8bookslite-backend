import { seedSuperAdmin } from '../seeds/seedSuperAdmin';
import { assertLocalDatabase } from './assertLocalDatabase';
import { runSeedTask } from './runSeedTask';

void runSeedTask('Admin bootstrap', async () => {
  assertLocalDatabase();
  await seedSuperAdmin();
});
