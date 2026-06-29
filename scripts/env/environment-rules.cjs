const APP_ENVIRONMENTS = ['local', 'shared-dev', 'staging', 'production'];

const COMMON_APPLICATION_OPERATIONS = ['app:start'];
const COMMON_READ_OPERATIONS = [
  'prisma:generate',
  'prisma:format',
  'prisma:validate',
  'prisma:migrate:status',
  'verify',
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
      'seed:reference',
      'verify',
    ],
    confirmationByOperation: {
      'prisma:migrate:deploy': {
        variable: 'CONFIRM_PRODUCTION_MIGRATION',
        value: 'true',
      },
      'seed:reference': {
        variable: 'CONFIRM_PRODUCTION_REFERENCE_SEED',
        value: 'true',
      },
    },
  },
};

module.exports = {
  APP_ENVIRONMENTS,
  ENVIRONMENT_RULES,
};
