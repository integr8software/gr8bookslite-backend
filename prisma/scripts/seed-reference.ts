import { seedSubscriptionPlans } from '../seeds/seedSubscriptionPlans';
import { runSeedTask } from './runSeedTask';

void runSeedTask('Reference seed', async () => {
  await seedSubscriptionPlans();
});
