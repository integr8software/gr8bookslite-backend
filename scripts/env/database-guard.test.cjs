const assert = require('node:assert/strict');
const test = require('node:test');
const {
  assertDatabaseEnvironment,
  classifyOperation,
} = require('./database-guard.cjs');

function databaseUrl(host, databaseName) {
  return `postgresql://user:password@${host}:5432/${databaseName}?schema=public`;
}

function environment(appEnvironment, host, databaseName, additional = {}) {
  const url = databaseUrl(host, databaseName);

  return {
    APP_ENV: appEnvironment,
    DATABASE_URL: url,
    DIRECT_URL: url,
    ...additional,
  };
}

test('classifies supported Prisma and application operations', () => {
  assert.equal(
    classifyOperation(['prisma', 'migrate', 'deploy']),
    'prisma:migrate:deploy',
  );
  assert.equal(classifyOperation(['prisma', 'db', 'push']), 'prisma:db:push');
  assert.equal(classifyOperation(['nest', 'start', '--watch']), 'app:start');
});

test('allows local development operations for the exact local database', () => {
  const result = assertDatabaseEnvironment(
    environment('local', 'localhost', 'gr8booksneo_dev'),
    ['prisma', 'migrate', 'reset'],
  );

  assert.equal(result.operation, 'prisma:migrate:reset');
});

test('rejects a wrong local database name', () => {
  assert.throws(
    () =>
      assertDatabaseEnvironment(environment('local', 'localhost', 'postgres'), [
        'prisma',
        'migrate',
        'reset',
      ]),
    /database "postgres" is not allowed/,
  );
});

test('rejects a remote host when APP_ENV is local', () => {
  assert.throws(
    () =>
      assertDatabaseEnvironment(
        environment('local', 'server1.integr8.com.ph', 'gr8booksneo_dev'),
        ['prisma', 'migrate', 'reset'],
      ),
    /host "server1\.integr8\.com\.ph" is not allowed/,
  );
});

test('allows shared development deploy and rejects destructive operations', () => {
  const sharedEnvironment = environment(
    'shared-dev',
    'server1.integr8.com.ph',
    'gr8booksneo_shared_dev',
  );

  assert.equal(
    assertDatabaseEnvironment(sharedEnvironment, [
      'prisma',
      'migrate',
      'deploy',
    ]).operation,
    'prisma:migrate:deploy',
  );
  assert.throws(
    () =>
      assertDatabaseEnvironment(sharedEnvironment, [
        'prisma',
        'migrate',
        'reset',
      ]),
    /forbidden when APP_ENV=shared-dev/,
  );
  assert.throws(
    () =>
      assertDatabaseEnvironment(sharedEnvironment, [
        'prisma',
        'migrate',
        'dev',
      ]),
    /forbidden when APP_ENV=shared-dev/,
  );
  assert.throws(
    () =>
      assertDatabaseEnvironment(sharedEnvironment, ['prisma', 'db', 'push']),
    /forbidden when APP_ENV=shared-dev/,
  );
});

test('requires an explicit staging database fingerprint', () => {
  const stagingEnvironment = environment(
    'staging',
    'ep-example.neon.tech',
    'gr8booksneo_staging',
  );

  assert.throws(
    () =>
      assertDatabaseEnvironment(stagingEnvironment, [
        'prisma',
        'migrate',
        'status',
      ]),
    /DATABASE_GUARD_HOSTS is required/,
  );

  assert.equal(
    assertDatabaseEnvironment(
      {
        ...stagingEnvironment,
        DATABASE_GUARD_HOSTS: 'ep-example.neon.tech',
        DATABASE_GUARD_NAME: 'gr8booksneo_staging',
      },
      ['prisma', 'migrate', 'status'],
    ).operation,
    'prisma:migrate:status',
  );
});

test('requires confirmation for production migration deploy', () => {
  const productionEnvironment = environment(
    'production',
    'ep-production.neon.tech',
    'gr8booksneo_production',
    {
      DATABASE_GUARD_HOSTS: 'ep-production.neon.tech',
      DATABASE_GUARD_NAME: 'gr8booksneo_production',
    },
  );

  assert.throws(
    () =>
      assertDatabaseEnvironment(productionEnvironment, [
        'prisma',
        'migrate',
        'deploy',
      ]),
    /CONFIRM_PRODUCTION_MIGRATION=true is required/,
  );

  assert.equal(
    assertDatabaseEnvironment(
      { ...productionEnvironment, CONFIRM_PRODUCTION_MIGRATION: 'true' },
      ['prisma', 'migrate', 'deploy'],
    ).operation,
    'prisma:migrate:deploy',
  );
});

test('requires confirmation for production reference seed', () => {
  const productionEnvironment = environment(
    'production',
    'ep-production.neon.tech',
    'gr8booksneo_production',
    {
      DATABASE_GUARD_HOSTS: 'ep-production.neon.tech',
      DATABASE_GUARD_NAME: 'gr8booksneo_production',
    },
  );
  const command = ['ts-node', 'prisma/scripts/seed-reference.ts'];

  assert.throws(
    () => assertDatabaseEnvironment(productionEnvironment, command),
    /CONFIRM_PRODUCTION_REFERENCE_SEED=true is required/,
  );

  assert.equal(
    assertDatabaseEnvironment(
      { ...productionEnvironment, CONFIRM_PRODUCTION_REFERENCE_SEED: 'true' },
      command,
    ).operation,
    'seed:reference',
  );
});

test('allows fixtures and admin bootstrap locally but rejects them remotely', () => {
  const localEnvironment = environment('local', 'localhost', 'gr8booksneo_dev');
  const sharedEnvironment = environment(
    'shared-dev',
    'server1.integr8.com.ph',
    'gr8booksneo_shared_dev',
  );

  for (const command of [
    ['ts-node', 'prisma/scripts/seed-local-fixtures.ts'],
    ['ts-node', 'prisma/scripts/bootstrap-admin.ts'],
  ]) {
    assert.doesNotThrow(() =>
      assertDatabaseEnvironment(localEnvironment, command),
    );
    assert.throws(
      () => assertDatabaseEnvironment(sharedEnvironment, command),
      /forbidden when APP_ENV=shared-dev/,
    );
  }
});

test('allows production application startup without migration confirmation', () => {
  const productionEnvironment = environment(
    'production',
    'ep-production.neon.tech',
    'gr8booksneo_production',
    {
      DATABASE_GUARD_HOSTS: 'ep-production.neon.tech',
      DATABASE_GUARD_NAME: 'gr8booksneo_production',
    },
  );

  assert.equal(
    assertDatabaseEnvironment(productionEnvironment, [
      'node',
      'dist/src/main.js',
    ]).operation,
    'app:start',
  );
});

test('allows read-only production verification without migration confirmation', () => {
  const productionEnvironment = environment(
    'production',
    'ep-production.neon.tech',
    'gr8booksneo_production',
    {
      DATABASE_GUARD_HOSTS: 'ep-production.neon.tech',
      DATABASE_GUARD_NAME: 'gr8booksneo_production',
    },
  );

  for (const script of [
    'prisma/scripts/verifyMigrationHistory.ts',
    'prisma/scripts/verifyPermissionArchitecture.ts',
  ]) {
    assert.equal(
      assertDatabaseEnvironment(productionEnvironment, ['ts-node', script])
        .operation,
      'verify',
    );
  }
});

test('validates both DATABASE_URL and DIRECT_URL', () => {
  const localEnvironment = environment('local', 'localhost', 'gr8booksneo_dev');
  localEnvironment.DIRECT_URL = databaseUrl(
    'server1.integr8.com.ph',
    'gr8booksneo_dev',
  );

  assert.throws(
    () =>
      assertDatabaseEnvironment(localEnvironment, ['prisma', 'migrate', 'dev']),
    /DIRECT_URL host "server1\.integr8\.com\.ph" is not allowed/,
  );
});

test('rejects missing APP_ENV and unknown commands', () => {
  assert.throws(
    () =>
      assertDatabaseEnvironment(
        {
          DATABASE_URL: databaseUrl('localhost', 'gr8booksneo_dev'),
          DIRECT_URL: databaseUrl('localhost', 'gr8booksneo_dev'),
        },
        ['prisma', 'generate'],
      ),
    /APP_ENV must be one of/,
  );

  assert.throws(
    () =>
      assertDatabaseEnvironment(
        environment('local', 'localhost', 'gr8booksneo_dev'),
        ['unknown-command'],
      ),
    /Cannot classify guarded command/,
  );
});
