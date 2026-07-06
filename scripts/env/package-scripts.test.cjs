const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const test = require('node:test');
const packageJson = require('../../package.json');

const scripts = packageJson.scripts;

test('database scripts use explicit environment names and guarded runners', () => {
  assert.equal(scripts['db:migrate:deploy'], undefined);
  assert.equal(scripts['start:prod'], undefined);
  assert.match(scripts['dev:local'], /run-with-env\.cjs \.env /);
  assert.match(scripts['dev:shared'], /run-with-env\.cjs \.env\.shared-dev /);
  assert.match(
    scripts['db:migrate:shared'],
    /run-with-env\.cjs \.env\.shared-dev prisma migrate deploy/,
  );
  assert.match(
    scripts['db:migrate:staging'],
    /run-with-process-env\.cjs staging prisma migrate deploy/,
  );
  assert.match(
    scripts['db:migrate:production'],
    /run-with-process-env\.cjs production prisma migrate deploy/,
  );

  for (const environment of ['shared', 'staging', 'production']) {
    assert.match(
      scripts[`db:migrate:${environment}`],
      new RegExp(`db:verify-migrations:${environment}`),
    );
  }
});

test('hosted application startup is explicit, guarded, and migration-free', () => {
  assert.match(
    scripts['start:staging'],
    /run-with-process-env\.cjs staging node dist\/src\/main\.js/,
  );
  assert.match(
    scripts['start:production'],
    /run-with-process-env\.cjs production node dist\/src\/main\.js/,
  );

  for (const scriptName of ['start', 'start:staging', 'start:production']) {
    assert.doesNotMatch(scripts[scriptName], /migrate|prisma/);
  }
});

test('database verification checks migrations and permission architecture', () => {
  const expectedRunners = {
    local: 'run-with-env.cjs .env',
    shared: 'run-with-env.cjs .env.shared-dev',
    staging: 'run-with-process-env.cjs staging',
    production: 'run-with-process-env.cjs production',
  };

  for (const [environment, runner] of Object.entries(expectedRunners)) {
    const script = scripts[`db:verify:${environment}`];

    assert.match(script, new RegExp(`db:status:${environment}`));
    assert.match(script, new RegExp(`db:verify-migrations:${environment}`));
    assert.match(script, new RegExp(runner.replaceAll('.', '\\.')));
    assert.match(script, /verifyPermissionArchitecture\.ts/);
    assert.doesNotMatch(
      script,
      /migrate deploy|migrate reset|migrate dev|db push/,
    );
  }
});

test('migration history verification is available for every environment', () => {
  for (const environment of ['local', 'shared', 'staging', 'production']) {
    assert.match(
      scripts[`db:verify-migrations:${environment}`],
      /verifyMigrationHistory\.ts/,
    );
  }
});

test('sync scripts automate shared push and local pull workflows', () => {
  assert.equal(
    scripts['sync:push'],
    'npm run db:verify-migrations:shared && npm run db:migrate:shared && npm run db:verify:shared',
  );

  assert.equal(
    scripts['sync:pull'],
    'git pull && npm ci && npm run db:migrate:local && npm run db:verify:local && npm run typecheck && npm test && npm run dev',
  );
});

test('seed scripts separate reference data, fixtures, and admin bootstrap', () => {
  for (const environment of ['local', 'shared', 'staging', 'production']) {
    assert.match(
      scripts[`db:seed:reference:${environment}`],
      /seed-reference\.ts/,
    );
  }

  assert.match(scripts['db:seed:fixtures:local'], /seed-local-fixtures\.ts/);
  assert.match(scripts['db:bootstrap-admin:local'], /bootstrap-admin\.ts/);

  assert.equal(scripts['db:seed:fixtures:shared'], undefined);
  assert.equal(scripts['db:bootstrap-admin:shared'], undefined);
});

test('safe provisioning scripts are available without full db seed aliases', () => {
  const expectedRunners = {
    current: 'run-with-env.cjs .env',
    shared: 'run-with-env.cjs .env.shared-dev',
    staging: 'run-with-process-env.cjs staging',
    production: 'run-with-process-env.cjs production',
  };

  for (const [environment, runner] of Object.entries(expectedRunners)) {
    assert.match(
      scripts[`db:provision:${environment}`],
      new RegExp(
        `${runner.replaceAll('.', '\\.')} ts-node prisma/scripts/provision-platform\\.ts`,
      ),
    );
    assert.match(
      scripts[`db:audit-legacy-saas-access:${environment}`],
      /audit-legacy-saas-access\.ts/,
    );
    assert.match(
      scripts[`db:backfill-legacy-saas-access:${environment}`],
      /backfill-legacy-saas-access\.ts/,
    );
  }

  assert.equal(scripts['db:provision'], 'npm run db:provision:current');

  for (const scriptName of [
    'db:seed:safe:current',
    'db:seed:safe:shared',
    'db:seed:safe:staging',
    'db:seed:safe:production',
    'db:seed:platform-catalog:current',
    'db:seed:platform-catalog:shared',
    'db:seed:platform-catalog:staging',
    'db:seed:platform-catalog:production',
    'db:seed:module-systems:current',
    'db:seed:module-systems:shared',
    'db:seed:module-systems:staging',
    'db:seed:module-systems:production',
  ]) {
    assert.equal(scripts[scriptName], undefined);
  }

  for (const scriptName of [
    'db:provision:shared',
    'db:provision:staging',
    'db:provision:production',
  ]) {
    assert.doesNotMatch(scripts[scriptName], /prisma db seed/);
  }
});

test('legacy company module compatibility commands are retired', () => {
  assert.deepEqual(
    Object.keys(scripts).filter((scriptName) =>
      /company-module|company-modules/.test(scriptName),
    ),
    [],
  );
});

test('hosted runner rejects a mismatched APP_ENV before executing a command', () => {
  const result = spawnSync(
    process.execPath,
    [
      path.resolve(__dirname, '..', 'run-with-process-env.cjs'),
      'staging',
      'prisma',
      'migrate',
      'status',
    ],
    {
      encoding: 'utf8',
      env: {
        ...process.env,
        APP_ENV: 'production',
      },
    },
  );

  assert.equal(result.status, 1);
  assert.match(
    result.stderr,
    /expected APP_ENV=staging, received APP_ENV=production/,
  );
});
