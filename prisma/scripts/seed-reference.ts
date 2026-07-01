import { seedAddressReferences } from '../seeds/seedAddressReferences';
import { seedAlphanumericTaxCodes } from '../seeds/seedAlphanumericTaxCodes';
import { seedSubscriptionPlans } from '../seeds/seedSubscriptionPlans';
import { runSeedTask } from './runSeedTask';

void runSeedTask('Reference seed', async () => {
  await seedAddressReferences();
  await seedAlphanumericTaxCodes();
  await seedSubscriptionPlans();
});
