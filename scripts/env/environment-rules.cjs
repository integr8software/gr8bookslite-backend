const APP_ENVIRONMENTS = ['local', 'shared-dev', 'staging', 'production'];

const COMMON_APPLICATION_OPERATIONS = ['app:start'];
const COMMON_READ_OPERATIONS = [
  'prisma:generate',
  'prisma:format',
  'prisma:validate',
  'prisma:migrate:status',
  'verify',
];
const SAFE_INFRASTRUCTURE_SEED_OPERATIONS = [
  'backfill:legacy-saas-access',
  'provision:platform',
  'repair:legacy-company-subscriptions',
  'repair:company-bootstrap',
];

const ENVIRONMENT_RULES = {
  local: {
    allowedHosts: ['localhost', '127.0.0.1', '[::1]'],
    allowedDatabaseNames: ['gr8booksneo_dev'],
    allowedOperations: [
      ...COMMON_APPLICATION_OPERATIONS,
      ...COMMON_READ_OPERATIONS,
      'bootstrap:admin',
      'maintenance',
      'prisma:db:seed',
      'prisma:migrate:dev',
      'prisma:migrate:resolve',
      'prisma:migrate:reset',
      'prisma:studio',
      ...SAFE_INFRASTRUCTURE_SEED_OPERATIONS,
      'seed:fixtures',
      'seed:reference',
    ],
  },
  'shared-dev': {
    allowedHosts: ['server1.integr8.com.ph'],
    allowedDatabaseNames: ['gr8booksneo_shared_dev'],
    allowedOperations: [
      ...COMMON_APPLICATION_OPERATIONS,
      ...COMMON_READ_OPERATIONS,
      'prisma:migrate:deploy',
      'prisma:migrate:resolve',
      'prisma:studio',
      ...SAFE_INFRASTRUCTURE_SEED_OPERATIONS,
      'seed:reference',
    ],
  },
  staging: {
    allowedHostsFromEnvironment: true,
    allowedDatabaseNamesFromEnvironment: true,
    allowedOperations: [
      ...COMMON_APPLICATION_OPERATIONS,
      'prisma:generate',
      'prisma:migrate:deploy',
      'prisma:migrate:resolve',
      'prisma:migrate:status',
      ...SAFE_INFRASTRUCTURE_SEED_OPERATIONS,
      'seed:reference',
      'verify',
    ],
  },
  production: {
    allowedHostsFromEnvironment: true,
    allowedDatabaseNamesFromEnvironment: true,
    allowedOperations: [
      ...COMMON_APPLICATION_OPERATIONS,
      'prisma:generate',
      'prisma:migrate:deploy',
      'prisma:migrate:resolve',
      'prisma:migrate:status',
      ...SAFE_INFRASTRUCTURE_SEED_OPERATIONS,
      'seed:reference',
      'verify',
    ],
    confirmationByOperation: {
      'seed:reference': {
        variable: 'CONFIRM_PRODUCTION_REFERENCE_SEED',
        value: 'true',
      },
      'backfill:legacy-saas-access': {
        variable: 'ALLOW_PRODUCTION_SAFE_SEED',
        value: 'true',
      },
      'provision:platform': {
        variable: 'ALLOW_PRODUCTION_SAFE_SEED',
        value: 'true',
      },
      'repair:legacy-company-subscriptions': {
        variable: 'ALLOW_PRODUCTION_SAFE_SEED',
        value: 'true',
      },
      'repair:company-bootstrap': {
        variable: 'ALLOW_PRODUCTION_SAFE_SEED',
        value: 'true',
      },
      'prisma:migrate:resolve': {
        variable: 'ALLOW_MIGRATION_RESOLVE',
        value: 'true',
      },
    },
  },
};

module.exports = {
  APP_ENVIRONMENTS,
  ENVIRONMENT_RULES,
};
