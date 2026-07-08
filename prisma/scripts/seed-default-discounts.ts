import { seedCompanyChartAccountDefaults } from '../../src/modules/maintenance/chart-of-accounts/seed/chart-of-accounts.seed';
import { seedCompanyDiscountMaintenanceDefaults } from '../../src/modules/maintenance/discount-maintenance/seed/discount-maintenance.seed';
import { prisma } from '../seeds/prismaClient';
import { runSeedTask } from './runSeedTask';

void runSeedTask('Default discount seed', async () => {
  const companies = await prisma.company.findMany({
    select: { id: true, name: true },
    orderBy: { id: 'asc' },
  });

  for (const company of companies) {
    const createdCount = await prisma.$transaction(async (tx) => {
      await seedCompanyChartAccountDefaults(tx, company.id);

      return seedCompanyDiscountMaintenanceDefaults(tx, company.id);
    });

    console.log(
      `Seeded ${createdCount} default discount${createdCount === 1 ? '' : 's'} for ${company.name} (${company.id}).`,
    );
  }
});
