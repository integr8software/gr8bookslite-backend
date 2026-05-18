import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AccessControlModule } from '../../common/access/access-control.module';
import { BillingModule } from '../billing/billing.module';
import { AuthModule } from '../auth/auth.module';
import { OnboardingController } from './onboarding.controller';
import { OnboardingLogoStorageService } from './services/onboarding-logo-storage.service';
import { OnboardingService } from './onboarding.service';

@Module({
  imports: [
    ConfigModule,
    AccessControlModule,
    BillingModule,
    AuthModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>(
          'JWT_SECRET',
          'change-me-in-production',
        ),
        signOptions: {
          expiresIn: Number(
            configService.get<string | number>(
              'JWT_EXPIRES_IN_SECONDS',
              86400,
            ),
          ),
        },
      }),
    }),
  ],
  controllers: [OnboardingController],
  providers: [OnboardingService, OnboardingLogoStorageService],
})
export class OnboardingModule {}
