import { seedDefaultBankAccountsForCompany } from '../../src/modules/maintenance/bank-masterfile/default-bank-accounts';
import { prisma } from '../seeds/prismaClient';
import { runSeedTask } from './runSeedTask';

void runSeedTask('Default bank account seed', async () => {
  const companies = await prisma.company.findMany({
    select: { id: true, name: true },
    orderBy: { id: 'asc' },
  });

  for (const company of companies) {
    const createdCount = await prisma.$transaction((tx) =>
      seedDefaultBankAccountsForCompany(tx, company.id),
    );

    console.log(
      `Seeded ${createdCount} default bank account${createdCount === 1 ? '' : 's'} for ${company.name} (${company.id}).`,
    );
  }
});
