import { AppEnvironments, validateEnvironment } from './environment';

describe('validateEnvironment', () => {
  it.each(AppEnvironments)('accepts APP_ENV=%s', (appEnvironment) => {
    const environment = {
      APP_ENV: appEnvironment,
      CORS_ALLOWED_ORIGINS:
        appEnvironment === 'local' ? undefined : 'https://staging.example.com',
      STORAGE_PROVIDER: 'vps',
      STORAGE_ENV: appEnvironment === 'staging' ? 'staging' : 'local',
      VPS_STORAGE_API_URL: 'http://storage.example.com/api/v1/storage/internal',
      VPS_STORAGE_PUBLIC_URL: 'http://storage.example.com',
      VPS_STORAGE_SECRET: 'test-secret',
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
    expect(() =>
      validateEnvironment({
        APP_ENV: 'staging',
        STORAGE_PROVIDER: 'vps',
        STORAGE_ENV: 'staging',
        VPS_STORAGE_API_URL:
          'http://storage.example.com/api/v1/storage/internal',
        VPS_STORAGE_PUBLIC_URL: 'http://storage.example.com',
        VPS_STORAGE_SECRET: 'test-secret',
      }),
    ).toThrow(
      'A frontend origin is required when APP_ENV is shared-dev, staging, or production. Set FRONTEND_URL or CORS_ALLOWED_ORIGINS.',
    );
  });

  it('rejects localhost frontend origin for staging', () => {
    expect(() =>
      validateEnvironment({
        APP_ENV: 'staging',
        CORS_ALLOWED_ORIGINS: 'http://localhost:3001',
        STORAGE_PROVIDER: 'vps',
        STORAGE_ENV: 'staging',
        VPS_STORAGE_API_URL:
          'http://storage.example.com/api/v1/storage/internal',
        VPS_STORAGE_PUBLIC_URL: 'http://storage.example.com',
        VPS_STORAGE_SECRET: 'test-secret',
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
      STORAGE_PROVIDER: 'vps',
      STORAGE_ENV: 'staging',
      VPS_STORAGE_API_URL: 'http://storage.example.com/api/v1/storage/internal',
      VPS_STORAGE_PUBLIC_URL: 'http://storage.example.com',
      VPS_STORAGE_SECRET: 'test-secret',
    };

    expect(validateEnvironment(environment)).toBe(environment);
  });

  it('requires VPS settings when STORAGE_PROVIDER=vps', () => {
    expect(() =>
      validateEnvironment({
        APP_ENV: 'local',
        STORAGE_PROVIDER: 'vps',
      }),
    ).toThrow(
      'Missing required environment value(s): STORAGE_ENV, VPS_STORAGE_API_URL, VPS_STORAGE_PUBLIC_URL, VPS_STORAGE_SECRET.',
    );
  });

  it('rejects invalid VPS storage environments', () => {
    expect(() =>
      validateEnvironment({
        APP_ENV: 'local',
        STORAGE_PROVIDER: 'vps',
        STORAGE_ENV: 'production',
        VPS_STORAGE_API_URL:
          'http://storage.example.com/api/v1/storage/internal',
        VPS_STORAGE_PUBLIC_URL: 'http://storage.example.com',
        VPS_STORAGE_SECRET: 'test-secret',
      }),
    ).toThrow(
      'Invalid STORAGE_ENV "production". Expected one of: local, shared-dev, staging.',
    );
  });

  it('requires Supabase settings when STORAGE_PROVIDER=supabase', () => {
    expect(() =>
      validateEnvironment({
        APP_ENV: 'local',
        STORAGE_PROVIDER: 'supabase',
      }),
    ).toThrow(
      'Missing required environment value(s): SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_STORAGE_BUCKET.',
    );
  });
});
