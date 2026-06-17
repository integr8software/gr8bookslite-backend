export const AppEnvironments = [
  'local',
  'shared-dev',
  'staging',
  'production',
] as const;

export type AppEnvironment = (typeof AppEnvironments)[number];

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

  return environment;
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
