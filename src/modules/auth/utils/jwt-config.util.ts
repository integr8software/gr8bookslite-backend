import { ConfigService } from '@nestjs/config';

const DevelopmentJwtSecret = 'change-me-in-production';
const DefaultJwtExpiresInSeconds = 86400;

export function getJwtSecret(configService: ConfigService) {
  const secret = configService.get<string>('JWT_SECRET')?.trim();

  if (secret) {
    return secret;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be set in production.');
  }

  return DevelopmentJwtSecret;
}

export function getJwtExpiresInSeconds(configService: ConfigService) {
  return Number(configService.get<string | number>('JWT_EXPIRES_IN_SECONDS', DefaultJwtExpiresInSeconds));
}
