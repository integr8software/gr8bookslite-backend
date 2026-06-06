import { assertLocalDatabase } from './scripts/assertLocalDatabase';
import { prisma } from './seeds/prismaClient';
import { seedSubscriptionPlans } from './seeds/seedSubscriptionPlans';
import { seedSuperAdmin } from './seeds/seedSuperAdmin';

async function main() {
  assertLocalDatabase();
  await seedSubscriptionPlans();
  await seedSuperAdmin();
}

main()
  .catch((error: unknown) => {
    console.error('Failed to seed database.');
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
