const { spawnSync } = require('node:child_process');
const { loadEnvFile } = require('./env/env-loader.cjs');

loadEnvFile('.env');
const databaseUrl = new URL(process.env.DATABASE_URL);
if (process.env.APP_ENV !== 'local' || !['localhost', '127.0.0.1'].includes(databaseUrl.hostname)) {
  throw new Error('Refusing to back up a non-local database.');
}
databaseUrl.searchParams.delete('schema');
const result = spawnSync('pg_dump', ['--format=custom', '--file=.codex/pre-sidebar-catalog-migration.dump', databaseUrl.toString()], { stdio: 'inherit' });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
