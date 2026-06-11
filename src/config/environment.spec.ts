import { AppEnvironments, validateEnvironment } from './environment';

describe('validateEnvironment', () => {
  it.each(AppEnvironments)('accepts APP_ENV=%s', (appEnvironment) => {
    const environment = { APP_ENV: appEnvironment };

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
});
