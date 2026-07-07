import { seedDefaultChartAccountsForCompany } from '../../src/modules/maintenance/chart-of-accounts/default-chart-accounts';
import { seedDefaultDiscountsForCompany } from '../../src/modules/maintenance/discounts/default-discounts';
import { prisma } from '../seeds/prismaClient';
import { runSeedTask } from './runSeedTask';

void runSeedTask('Default discount seed', async () => {
  const companies = await prisma.company.findMany({
    select: { id: true, name: true },
    orderBy: { id: 'asc' },
  });

  for (const company of companies) {
    const createdCount = await prisma.$transaction(async (tx) => {
      await seedDefaultChartAccountsForCompany(tx, company.id);

      return seedDefaultDiscountsForCompany(tx, company.id);
    });

    console.log(
      `Seeded ${createdCount} default discount${createdCount === 1 ? '' : 's'} for ${company.name} (${company.id}).`,
    );
  }
});
