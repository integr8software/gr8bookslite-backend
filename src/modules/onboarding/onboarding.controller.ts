import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SaveOnboardingBillingDto } from './dto/save-onboarding-billing.dto';
import { SelectOnboardingPlanDto } from './dto/select-onboarding-plan.dto';
import { OnboardingService } from './onboarding.service';

@UseGuards(JwtAuthGuard)
@Controller({
  path: 'onboarding',
  version: '1',
})
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Get('plans')
  getPlans() {
    return this.onboardingService.getPlans();
  }

  @Get('draft')
  getDraft(@CurrentUser() user: AuthUser) {
    return this.onboardingService.getDraft(user);
  }

  @Post('plan')
  selectPlan(
    @CurrentUser() user: AuthUser,
    @Body() dto: SelectOnboardingPlanDto,
  ) {
    return this.onboardingService.selectPlan(user, dto);
  }

  @Post('billing')
  saveBilling(
    @CurrentUser() user: AuthUser,
    @Body() dto: SaveOnboardingBillingDto,
  ) {
    return this.onboardingService.saveBilling(user, dto);
  }
}
