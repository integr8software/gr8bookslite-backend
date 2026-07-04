import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { prisma } from '../seeds/prismaClient';

type MigrationRecord = {
  migrationName: string;
  checksum: string;
  finishedAt: Date | null;
  rolledBackAt: Date | null;
};

type RepositoryChecksum = {
  canonical: string;
  platform: string;
};

const migrationsDirectory = path.resolve(process.cwd(), 'prisma/migrations');

// Keep verified hosted checksum exceptions explicit instead of rewriting
// migration history. The first migration came from a lost uncommitted version;
// the second was deployed with CRLF bytes before migration SQL was forced to LF.
const acceptedLegacyChecksums = new Map<string, Set<string>>([
  [
    '20260610090000_align_cash_disbursement_role_permissions',
    new Set([
      'ef868b1994afacd6f951b8e47951b510a6eeefb1ebe3b4cfb6528fe7361d3da5',
    ]),
  ],
  [
    '20260611070157_drop_legacy_permission_actions',
    new Set([
      '7cf7a469999b228ad66758dee59fc59a59371b8b7fe1c13821314d25b7a17d82',
    ]),
  ],
  [
    '20260606120000_align_role_permission_catalog',
    new Set([
      'f0387fb911d464cfeb8101cfaff7474c331f10b1d8ef3cf5566176b793e4dfc4',
    ]),
  ],
  [
    '20260610120000_seed_backend_permission_catalog',
    new Set([
      '80ebcfeb06abf3f4e622b4b493179bbb2a6129d4e6559f813bafbd6071c4e777',
    ]),
  ],
  [
    '20260610123000_merge_legacy_permission_catalog',
    new Set([
      'e3e81e0e519f52cbedb721ccdbbcf13d7e7449b3d82ce26b740ffa10e69c0c96',
    ]),
  ],
  [
    '20260610150000_abbreviate_submodule_permission_codes',
    new Set([
      'ee3d1c234484444ac6e25320dd1f86209a04314eb6f90ffa9daa3d3dbfdcbb4a',
    ]),
  ],
  [
    '20260623090000_add_bank_masterfile_fields',
    new Set([
      '3bbc87c72b77fd1aab31629b046a3adc900c41e7a0b817b251821e75e72f7563',
    ]),
  ],
]);

async function loadRepositoryChecksums() {
  const entries = await readdir(migrationsDirectory, {
    withFileTypes: true,
  });
  const migrationNames = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  const checksums = new Map<string, RepositoryChecksum>();

  for (const migrationName of migrationNames) {
    const sqlPath = path.join(
      migrationsDirectory,
      migrationName,
      'migration.sql',
    );
    const sql = await readFile(sqlPath, 'utf8');
    const normalizedSql = sql.replace(/\r\n/g, '\n');
    checksums.set(migrationName, {
      canonical: createHash('sha256').update(normalizedSql).digest('hex'),
      // Prisma records the bytes it applies. On a Windows checkout those bytes
      // can contain CRLF even though the canonical repository form uses LF.
      platform: createHash('sha256').update(sql).digest('hex'),
    });
  }

  return checksums;
}

async function loadDatabaseHistory() {
  return prisma.$queryRaw<MigrationRecord[]>`
    SELECT
      "migration_name" AS "migrationName",
      "checksum",
      "finished_at" AS "finishedAt",
      "rolled_back_at" AS "rolledBackAt"
    FROM "_prisma_migrations"
    ORDER BY "started_at", "migration_name"
  `;
}

async function main() {
  const [repositoryChecksums, databaseHistory] = await Promise.all([
    loadRepositoryChecksums(),
    loadDatabaseHistory(),
  ]);
  const activeHistory = databaseHistory.filter(
    (migration) => migration.rolledBackAt === null,
  );
  const appliedHistory = activeHistory.filter(
    (migration) => migration.finishedAt !== null,
  );
  const failedHistory = activeHistory.filter(
    (migration) => migration.finishedAt === null,
  );
  const appliedNames = new Set(
    appliedHistory.map((migration) => migration.migrationName),
  );
  const missingFiles = appliedHistory
    .filter((migration) => !repositoryChecksums.has(migration.migrationName))
    .map((migration) => migration.migrationName);
  const checksumMismatches = appliedHistory
    .filter(
      (migration) =>
        repositoryChecksums.has(migration.migrationName) &&
        !Object.values(
          repositoryChecksums.get(migration.migrationName)!,
        ).includes(migration.checksum),
    );
  const acceptedLegacyMigrations = checksumMismatches.filter((migration) =>
    acceptedLegacyChecksums
      .get(migration.migrationName)
      ?.has(migration.checksum),
  );
  const modifiedMigrations = checksumMismatches
    .filter(
      (migration) =>
        !acceptedLegacyChecksums
          .get(migration.migrationName)
          ?.has(migration.checksum),
    )
    .map((migration) => ({
      migrationName: migration.migrationName,
      databaseChecksum: migration.checksum,
      repositoryChecksum: repositoryChecksums.get(migration.migrationName)!
        .canonical,
    }));
  const pendingMigrations = [...repositoryChecksums.keys()].filter(
    (migrationName) => !appliedNames.has(migrationName),
  );

  console.table({
    repositoryMigrations: repositoryChecksums.size,
    appliedMigrations: appliedHistory.length,
    pendingMigrations: pendingMigrations.length,
    failedMigrations: failedHistory.length,
    acceptedLegacyMigrations: acceptedLegacyMigrations.length,
    modifiedMigrations: modifiedMigrations.length,
    missingMigrationFiles: missingFiles.length,
  });

  const failures = [
    ...failedHistory.map(
      (migration) => `failed migration: ${migration.migrationName}`,
    ),
    ...modifiedMigrations.map(
      (migration) =>
        `modified applied migration: ${migration.migrationName}` +
        ` (database: ${migration.databaseChecksum}, repository: ${migration.repositoryChecksum})`,
    ),
    ...missingFiles.map(
      (migrationName) => `missing applied migration: ${migrationName}`,
    ),
  ];

  if (failures.length > 0) {
    throw new Error(
      `Migration history verification failed:\n- ${failures.join('\n- ')}`,
    );
  }
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
