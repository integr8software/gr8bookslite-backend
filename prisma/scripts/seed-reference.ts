import { seedAddressReferences } from '../seeds/seedAddressReferences';
import { seedTaxes } from '../seeds/seedTaxes';
import { seedSubscriptionPlans } from '../seeds/seedSubscriptionPlans';
import { seedTaxPostingRules } from '../../src/modules/tax/seed/tax.seed';
import { prisma } from '../seeds/prismaClient';
import { runSeedTask } from './runSeedTask';

void runSeedTask('Reference seed', async () => {
  await seedAddressReferences();
  await seedTaxes();
  await seedTaxPostingRules(prisma);
  await seedSubscriptionPlans();
});
