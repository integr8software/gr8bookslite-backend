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

const migrationsDirectory = path.resolve(process.cwd(), 'prisma/migrations');

async function loadRepositoryChecksums() {
  const entries = await readdir(migrationsDirectory, {
    withFileTypes: true,
  });
  const migrationNames = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  const checksums = new Map<string, string>();

  for (const migrationName of migrationNames) {
    const sqlPath = path.join(
      migrationsDirectory,
      migrationName,
      'migration.sql',
    );
    const sql = await readFile(sqlPath, 'utf8');
    const normalizedSql = sql.replace(/\r\n/g, '\n');
    checksums.set(
      migrationName,
      createHash('sha256').update(normalizedSql).digest('hex'),
    );
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
  const modifiedMigrations = appliedHistory
    .filter(
      (migration) =>
        repositoryChecksums.has(migration.migrationName) &&
        repositoryChecksums.get(migration.migrationName) !== migration.checksum,
    )
    .map((migration) => migration.migrationName);
  const pendingMigrations = [...repositoryChecksums.keys()].filter(
    (migrationName) => !appliedNames.has(migrationName),
  );

  console.table({
    repositoryMigrations: repositoryChecksums.size,
    appliedMigrations: appliedHistory.length,
    pendingMigrations: pendingMigrations.length,
    failedMigrations: failedHistory.length,
    modifiedMigrations: modifiedMigrations.length,
    missingMigrationFiles: missingFiles.length,
  });

  const failures = [
    ...failedHistory.map(
      (migration) => `failed migration: ${migration.migrationName}`,
    ),
    ...modifiedMigrations.map(
      (migrationName) => `modified applied migration: ${migrationName}`,
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
