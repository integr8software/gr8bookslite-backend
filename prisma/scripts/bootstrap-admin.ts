import { seedSuperAdmin } from '../seeds/seedSuperAdmin';
import { runSeedTask } from './runSeedTask';

void runSeedTask('Admin bootstrap', async () => {
  await seedSuperAdmin();
});

