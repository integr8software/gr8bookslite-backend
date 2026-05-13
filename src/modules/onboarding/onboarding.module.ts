import { Module } from '@nestjs/common';
import { AccessControlModule } from '../../common/access/access-control.module';
import { BillingModule } from '../billing/billing.module';
import { OnboardingController } from './onboarding.controller';
import { OnboardingLogoStorageService } from './services/onboarding-logo-storage.service';
import { OnboardingService } from './onboarding.service';

@Module({
  imports: [AccessControlModule, BillingModule],
  controllers: [OnboardingController],
  providers: [OnboardingService, OnboardingLogoStorageService],
})
export class OnboardingModule {}
