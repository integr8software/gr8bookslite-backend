import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { prisma } from '../seeds/prismaClient';

async function main() {
  const migrationName = process.argv[2];

  if (!migrationName) {
    throw new Error('Usage: ts-node repairLocalMigrationChecksum.ts <migration>');
  }

  const migrationPath = resolve(
    __dirname,
    '../migrations',
    migrationName,
    'migration.sql',
  );
  const migrationSql = readFileSync(migrationPath);
  const checksum = createHash('sha256').update(migrationSql).digest('hex');
  const updatedRows = await prisma.$executeRaw`
    UPDATE "_prisma_migrations"
    SET "checksum" = ${checksum}
    WHERE "migration_name" = ${migrationName}
  `;

  if (updatedRows !== 1) {
    throw new Error(
      `Expected to update one migration row, updated ${updatedRows}.`,
    );
  }

  console.log(`Updated local migration checksum for ${migrationName}.`);
}

void main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
