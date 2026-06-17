import { AppEnvironments, validateEnvironment } from './environment';

describe('validateEnvironment', () => {
  it.each(AppEnvironments)('accepts APP_ENV=%s', (appEnvironment) => {
    const environment = {
      APP_ENV: appEnvironment,
      CORS_ALLOWED_ORIGINS:
        appEnvironment === 'local'
          ? undefined
          : 'https://staging.example.com',
    };

    expect(validateEnvironment(environment)).toBe(environment);
  });

  it('rejects a missing APP_ENV', () => {
    expect(() => validateEnvironment({})).toThrow(
      'APP_ENV is required. Expected one of: local, shared-dev, staging, production.',
    );
  });

  it('rejects an invalid APP_ENV', () => {
    expect(() => validateEnvironment({ APP_ENV: 'development' })).toThrow(
      'Invalid APP_ENV "development". Expected one of: local, shared-dev, staging, production.',
    );
  });

  it('rejects missing frontend origin outside local', () => {
    expect(() => validateEnvironment({ APP_ENV: 'staging' })).toThrow(
      'A frontend origin is required when APP_ENV is shared-dev, staging, or production. Set FRONTEND_URL or CORS_ALLOWED_ORIGINS.',
    );
  });

  it('rejects localhost frontend origin for staging', () => {
    expect(() =>
      validateEnvironment({
        APP_ENV: 'staging',
        CORS_ALLOWED_ORIGINS: 'http://localhost:3001',
      }),
    ).toThrow(
      'The configured frontend origin cannot point to localhost for staging or production.',
    );
  });

  it('accepts FRONTEND_URL as an explicit override', () => {
    const environment = {
      APP_ENV: 'staging',
      CORS_ALLOWED_ORIGINS: 'https://wrong.example.com',
      FRONTEND_URL: 'https://frontend.example.com',
    };

    expect(validateEnvironment(environment)).toBe(environment);
  });
});
