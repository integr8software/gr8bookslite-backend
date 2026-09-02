import { assertLocalDatabase } from './scripts/assertLocalDatabase';
import { runSeedTask } from './scripts/runSeedTask';
import { seedAddressReferences } from './seeds/seedAddressReferences';
import { seedTaxes } from './seeds/seedTaxes';
import { seedLocalFixtures } from './seeds/seedLocalFixtures';
import { seedSubscriptionPlans } from './seeds/seedSubscriptionPlans';
import { seedSuperAdmin } from './seeds/seedSuperAdmin';
import { seedModules } from './seeds/seedModules';
import { seedModuleFields } from './seeds/seedModuleFields';
import { seedModuleSystems } from './seeds/seedModuleSystems';
import { seedPartyEntityTypes } from './seeds/seedPartyEntityTypes';
import { prisma } from './seeds/prismaClient';
import { seedTaxPostingRules } from '../src/modules/tax/seed/tax.seed';

void runSeedTask('Local Prisma seed', async () => {
  assertLocalDatabase();
  await seedSuperAdmin();
  await seedAddressReferences();
  await seedPartyEntityTypes();
  await seedTaxes();
  await seedModules();
  await seedModuleFields();
  await seedModuleSystems();
  await seedTaxPostingRules(prisma);
  await seedSubscriptionPlans();
  await seedLocalFixtures();
});
