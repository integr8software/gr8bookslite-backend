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
  'materialize:user-sidebars',
  'provision:platform',
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
      'materialize:user-sidebars': {
        variable: 'ALLOW_PRODUCTION_SAFE_SEED',
        value: 'true',
      },
      'provision:platform': {
        variable: 'ALLOW_PRODUCTION_SAFE_SEED',
        value: 'true',
      },
    },
  },
};

module.exports = {
  APP_ENVIRONMENTS,
  ENVIRONMENT_RULES,
};
