import { CompanyUnitType } from '@prisma/client';
import { assertLocalDatabase } from './assertLocalDatabase';
import { prisma } from '../seeds/prismaClient';

function getOptionValue(flag: string) {
  const index = process.argv.findIndex((value) => value === flag);

  if (index === -1) {
    return null;
  }

  return process.argv[index + 1] ?? null;
}

function shouldApplyChanges() {
  return (
    process.argv.includes('--apply') ||
    process.env.BACKFILL_COMPANY_HEAD_OFFICES_APPLY === 'true'
  );
}

function getCompanyIdFilter() {
  const rawCompanyId = getOptionValue('--company-id');

  if (!rawCompanyId) {
    return undefined;
  }

  const companyId = Number(rawCompanyId);

  if (!Number.isInteger(companyId) || companyId <= 0) {
    throw new Error('--company-id must be a positive integer.');
  }

  return companyId;
}

async function main() {
  assertLocalDatabase();

  const applyChanges = shouldApplyChanges();
  const companyId = getCompanyIdFilter();

  const companiesMissingHeadOffice = await prisma.company.findMany({
    where: {
      ...(companyId ? { id: companyId } : {}),
      units: {
        none: {
          type: CompanyUnitType.HEAD_OFFICE,
        },
      },
    },
    orderBy: {
      id: 'asc',
    },
  });

  if (companiesMissingHeadOffice.length === 0) {
    console.log('All matching companies already have a head office unit.');
    return;
  }

  console.log(
    `Found ${companiesMissingHeadOffice.length} compan${
      companiesMissingHeadOffice.length === 1 ? 'y' : 'ies'
    } missing a head office unit:`,
  );

  for (const company of companiesMissingHeadOffice) {
    console.log(`- #${company.id}: ${company.name}`);
  }

  if (!applyChanges) {
    console.log('');
    console.log('Dry run only. Re-run with --apply to create missing units.');
    return;
  }

  await prisma.$transaction(
    companiesMissingHeadOffice.map((company) =>
      prisma.companyUnit.create({
        data: {
          companyId: company.id,
          type: CompanyUnitType.HEAD_OFFICE,
          code: 'HEAD-OFFICE',
          name: 'Head Office',
          tin: company.tin,
          address: company.address,
          contactNumber: company.contactNumber,
          email: company.email,
          isActive: true,
          inheritsCompanyProfile: true,
          canTransactSales: true,
          canHoldInventory: true,
        },
      }),
    ),
  );

  console.log(
    `Created ${companiesMissingHeadOffice.length} missing head office unit${
      companiesMissingHeadOffice.length === 1 ? '' : 's'
    }.`,
  );
}

main()
  .catch((error: unknown) => {
    console.error('Failed to backfill company head offices.');
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
