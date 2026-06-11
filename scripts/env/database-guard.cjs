const {
  APP_ENVIRONMENTS,
  ENVIRONMENT_RULES,
} = require('./environment-rules.cjs');

const DATABASE_URL_VARIABLES = ['DATABASE_URL', 'DIRECT_URL'];

function classifyOperation(commandParts) {
  const [command, firstArgument, secondArgument] = commandParts;

  if (
    (command === 'nest' && firstArgument === 'start') ||
    (command === 'node' && firstArgument?.endsWith('dist/src/main.js'))
  ) {
    return 'app:start';
  }

  if (command === 'ts-node') {
    if (
      firstArgument?.endsWith('verifyMigrationHistory.ts') ||
      firstArgument?.endsWith('verifyPermissionArchitecture.ts')
    ) {
      return 'verify';
    }

    if (firstArgument?.endsWith('seed-reference.ts')) {
      return 'seed:reference';
    }

    if (firstArgument?.endsWith('seed-local-fixtures.ts')) {
      return 'seed:fixtures';
    }

    if (firstArgument?.endsWith('bootstrap-admin.ts')) {
      return 'bootstrap:admin';
    }

    return 'maintenance';
  }

  if (command !== 'prisma') {
    return null;
  }

  if (firstArgument === 'migrate' && secondArgument) {
    return `prisma:migrate:${secondArgument}`;
  }

  if (firstArgument === 'db' && secondArgument) {
    return `prisma:db:${secondArgument}`;
  }

  if (firstArgument) {
    return `prisma:${firstArgument}`;
  }

  return null;
}

function parseList(value) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function getExpectedValues(environment, rule, propertyName, variableName) {
  if (!rule[`${propertyName}FromEnvironment`]) {
    return rule[propertyName];
  }

  const configuredValue = environment[variableName];
  if (!configuredValue) {
    throw new Error(
      `${variableName} is required when APP_ENV=${environment.APP_ENV}.`,
    );
  }

  return parseList(configuredValue);
}

function parseDatabaseUrl(variableName, value) {
  if (!value) {
    throw new Error(`${variableName} is required.`);
  }

  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(
      `${variableName} is not a valid PostgreSQL connection URL.`,
    );
  }

  if (url.protocol !== 'postgresql:' && url.protocol !== 'postgres:') {
    throw new Error(`${variableName} must use the PostgreSQL protocol.`);
  }

  const databaseName = decodeURIComponent(url.pathname.replace(/^\/+/, ''));
  if (!databaseName) {
    throw new Error(`${variableName} must include a database name.`);
  }

  return {
    databaseName,
    hostname: url.hostname,
  };
}

function assertDatabaseEnvironment(environment, commandParts) {
  const appEnvironment = environment.APP_ENV;

  if (!APP_ENVIRONMENTS.includes(appEnvironment)) {
    throw new Error(`APP_ENV must be one of: ${APP_ENVIRONMENTS.join(', ')}.`);
  }

  const operation = classifyOperation(commandParts);
  if (!operation) {
    throw new Error(
      `Cannot classify guarded command: ${commandParts.join(' ')}.`,
    );
  }

  const rule = ENVIRONMENT_RULES[appEnvironment];
  if (!rule.allowedOperations.includes(operation)) {
    throw new Error(
      `Operation "${operation}" is forbidden when APP_ENV=${appEnvironment}.`,
    );
  }

  const allowedHosts = getExpectedValues(
    environment,
    rule,
    'allowedHosts',
    'DATABASE_GUARD_HOSTS',
  );
  const allowedDatabaseNames = getExpectedValues(
    environment,
    rule,
    'allowedDatabaseNames',
    'DATABASE_GUARD_NAME',
  );

  for (const variableName of DATABASE_URL_VARIABLES) {
    const database = parseDatabaseUrl(variableName, environment[variableName]);

    if (!allowedHosts.includes(database.hostname)) {
      throw new Error(
        `Refusing ${operation}: ${variableName} host "${database.hostname}" is not allowed for APP_ENV=${appEnvironment}.`,
      );
    }

    if (!allowedDatabaseNames.includes(database.databaseName)) {
      throw new Error(
        `Refusing ${operation}: ${variableName} database "${database.databaseName}" is not allowed for APP_ENV=${appEnvironment}.`,
      );
    }
  }

  const confirmation = rule.confirmationByOperation?.[operation];
  if (
    confirmation &&
    environment[confirmation.variable] !== confirmation.value
  ) {
    throw new Error(
      `${confirmation.variable}=${confirmation.value} is required for ${operation} when APP_ENV=${appEnvironment}.`,
    );
  }

  return {
    appEnvironment,
    operation,
  };
}

module.exports = {
  assertDatabaseEnvironment,
  classifyOperation,
  parseDatabaseUrl,
};
