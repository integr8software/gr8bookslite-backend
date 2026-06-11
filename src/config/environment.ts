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

  return environment;
}
