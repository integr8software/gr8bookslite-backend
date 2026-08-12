import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AccessControlModule } from '../../common/access/access-control.module';
import { StorageModule } from '../../storage/storage.module';
import { BillingModule } from '../billing/billing.module';
import { AuthModule } from '../auth/auth.module';
import { getJwtExpiresInSeconds, getJwtSecret } from '../auth/utils/jwt-config.util';
import { OnboardingController } from './onboarding.controller';
import { OnboardingLogoStorageService } from './services/onboarding-logo-storage.service';
import { OnboardingService } from './onboarding.service';
import { ReferenceModule } from '../reference/reference.module';

@Module({
  imports: [
    ConfigModule,
    AccessControlModule,
    StorageModule,
    BillingModule,
    AuthModule,
    ReferenceModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: getJwtSecret(configService),
        signOptions: {
          expiresIn: getJwtExpiresInSeconds(configService),
        },
      }),
    }),
  ],
  controllers: [OnboardingController],
  providers: [OnboardingService, OnboardingLogoStorageService],
})
export class OnboardingModule {}
