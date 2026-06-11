import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { assertLocalDatabase } from './assertLocalDatabase';
import { prisma } from '../seeds/prismaClient';

const Confirmation = '--confirm=RESET_PERMISSION_CATALOG';

async function main() {
  assertLocalDatabase();

  const [
    modules,
    submodules,
    permissions,
    roles,
    rolePermissions,
    membershipOverrides,
    companyModules,
    formSignatorySetups,
  ] = await Promise.all([
    prisma.platformModule.count(),
    prisma.platformSubmodule.count(),
    prisma.permission.count(),
    prisma.companyRole.count(),
    prisma.companyRolePermission.count(),
    prisma.membershipPermission.count(),
    prisma.companyModule.count(),
    prisma.formSignatorySetup.count(),
  ]);

  console.table({
    platformModules: modules,
    platformSubmodules: submodules,
    permissions,
    companyRoles: roles,
    companyRolePermissions: rolePermissions,
    membershipPermissions: membershipOverrides,
    companyModules,
    formSignatorySetups,
  });

  if (!process.argv.includes(Confirmation)) {
    console.error(`
Preview only. No data was changed.

This local-only reset permanently removes:
- all company roles and role permission assignments
- all membership permission overrides
- the complete module, submodule, and permission catalog
- company module selections and form signatory setups that reference modules

Users, companies, memberships, and audit-log rows are preserved.
Run again with ${Confirmation} to reset and rebuild the canonical catalog.
`);
    process.exitCode = 2;
    return;
  }

  await prisma.$disconnect();

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required.');
  }

  const psqlDatabaseUrl = new URL(databaseUrl);
  psqlDatabaseUrl.searchParams.delete('schema');

  const files = [
    resolve('prisma/scripts/resetPermissionCatalog.sql'),
    resolve(
      'prisma/migrations/20260610120000_seed_backend_permission_catalog/migration.sql',
    ),
    resolve('prisma/migrations/20260610124000_use_cd_module_code/migration.sql'),
    resolve(
      'prisma/migrations/20260610131000_use_apv_pca_permission_codes/migration.sql',
    ),
    resolve(
      'prisma/migrations/20260610150000_abbreviate_submodule_permission_codes/migration.sql',
    ),
  ];

  const result = spawnSync(
    'psql',
    [
      psqlDatabaseUrl.toString(),
      '--single-transaction',
      '--set=ON_ERROR_STOP=1',
      ...files.flatMap((file) => ['--file', file]),
    ],
    {
      stdio: 'inherit',
    },
  );

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(
      `Permission catalog reset failed with exit code ${result.status ?? 'unknown'}. PostgreSQL rolled back the transaction.`,
    );
  }

  console.log(
    'Permission catalog reset complete. Run db:verify-permissions:local to verify the rebuilt catalog.',
  );
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
