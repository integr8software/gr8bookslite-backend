export const AppEnvironments = [
  'local',
  'shared-dev',
  'staging',
  'production',
] as const;
const StorageProviders = ['vps', 'supabase'] as const;
const StorageEnvironments = ['local', 'shared-dev', 'staging'] as const;

export type AppEnvironment = (typeof AppEnvironments)[number];
type StorageProvider = (typeof StorageProviders)[number];

export function validateEnvironment(
  environment: Record<string, unknown>,
): Record<string, unknown> {
  const appEnvironment = environment.APP_ENV;

  if (typeof appEnvironment !== 'string' || appEnvironment.trim() === '') {
    throw new Error(
      `APP_ENV is required. Expected one of: ${AppEnvironments.join(', ')}.`,
    );
  }

  if (!AppEnvironments.includes(appEnvironment as AppEnvironment)) {
    throw new Error(
      `Invalid APP_ENV "${appEnvironment}". Expected one of: ${AppEnvironments.join(', ')}.`,
    );
  }

  validateFrontendOrigin(environment, appEnvironment as AppEnvironment);
  validateStorageEnvironment(environment);

  return environment;
}

function validateStorageEnvironment(environment: Record<string, unknown>) {
  const provider = getStringValue(environment.STORAGE_PROVIDER) || 'supabase';

  if (!StorageProviders.includes(provider as StorageProvider)) {
    throw new Error(
      `Invalid STORAGE_PROVIDER "${provider}". Expected one of: ${StorageProviders.join(', ')}.`,
    );
  }

  if (provider === 'vps') {
    requireEnvironmentValues(environment, [
      'STORAGE_ENV',
      'VPS_STORAGE_API_URL',
      'VPS_STORAGE_PUBLIC_URL',
      'VPS_STORAGE_ROOT',
      'VPS_STORAGE_SECRET',
    ]);

    const storageEnvironment = getStringValue(environment.STORAGE_ENV);

    if (!StorageEnvironments.includes(storageEnvironment as never)) {
      throw new Error(
        `Invalid STORAGE_ENV "${storageEnvironment}". Expected one of: ${StorageEnvironments.join(', ')}.`,
      );
    }

    return;
  }

  requireEnvironmentValues(environment, [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'SUPABASE_STORAGE_BUCKET',
  ]);
}

function requireEnvironmentValues(
  environment: Record<string, unknown>,
  keys: string[],
) {
  const missingKeys = keys.filter((key) => !getStringValue(environment[key]));

  if (missingKeys.length > 0) {
    throw new Error(
      `Missing required environment value(s): ${missingKeys.join(', ')}.`,
    );
  }
}

function validateFrontendOrigin(
  environment: Record<string, unknown>,
  appEnvironment: AppEnvironment,
) {
  const frontendOrigin = getConfiguredFrontendOrigin(environment);

  if (appEnvironment === 'local') {
    return;
  }

  if (!frontendOrigin) {
    throw new Error(
      'A frontend origin is required when APP_ENV is shared-dev, staging, or production. Set FRONTEND_URL or CORS_ALLOWED_ORIGINS.',
    );
  }

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(frontendOrigin);
  } catch {
    throw new Error('The configured frontend origin must be a valid URL.');
  }

  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    throw new Error('The configured frontend origin must use http or https.');
  }

  if (
    appEnvironment !== 'shared-dev' &&
    ['localhost', '127.0.0.1', '::1'].includes(parsedUrl.hostname)
  ) {
    throw new Error(
      'The configured frontend origin cannot point to localhost for staging or production.',
    );
  }
}

function getConfiguredFrontendOrigin(environment: Record<string, unknown>) {
  const frontendUrl = getStringValue(environment.FRONTEND_URL);

  if (frontendUrl) {
    return frontendUrl;
  }

  return getCorsOrigins(environment.CORS_ALLOWED_ORIGINS)[0];
}

function getCorsOrigins(value: unknown) {
  if (typeof value !== 'string') {
    return [];
  }

  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin && origin !== '*');
}

function getStringValue(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}
