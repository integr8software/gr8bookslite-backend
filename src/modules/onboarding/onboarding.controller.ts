import { Body, Controller, Get, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiCreatedResponse, ApiOkResponse } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SaveOnboardingBillingDto } from './dto/save-onboarding-billing.dto';
import { SaveOnboardingCompanyDetailsDto } from './dto/save-onboarding-company-details.dto';
import { SelectOnboardingPlanDto } from './dto/select-onboarding-plan.dto';
import {
  CompleteOnboardingResponseDto,
  GetOnboardingDraftResponseDto,
  OnboardingPlansResponseDto,
  SaveOnboardingBillingResponseDto,
  SaveOnboardingCompanyDetailsResponseDto,
  SelectOnboardingPlanResponseDto,
  UploadOnboardingCompanyLogoResponseDto,
} from './dto/onboarding-response.dto';
import { OnboardingService } from './onboarding.service';
import type { UploadedLogoFile } from './types/uploaded-logo-file.type';

@UseGuards(JwtAuthGuard)
@Controller({
  path: 'onboarding',
  version: '1',
})
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Post('company-logo')
  @ApiCreatedResponse({ type: UploadOnboardingCompanyLogoResponseDto })
  @UseInterceptors(FileInterceptor('logo'))
  uploadCompanyLogo(@CurrentUser() user: AuthUser, @UploadedFile() file: UploadedLogoFile | undefined) {
    return this.onboardingService.uploadCompanyLogo(user, file);
  }

  @Get('plans')
  @ApiOkResponse({ type: OnboardingPlansResponseDto })
  getPlans() {
    return this.onboardingService.getPlans();
  }

  @Get('draft')
  @ApiOkResponse({ type: GetOnboardingDraftResponseDto })
  getDraft(@CurrentUser() user: AuthUser) {
    return this.onboardingService.getDraft(user);
  }

  @Post('plan')
  @ApiCreatedResponse({ type: SelectOnboardingPlanResponseDto })
  selectPlan(@CurrentUser() user: AuthUser, @Body() dto: SelectOnboardingPlanDto) {
    return this.onboardingService.selectPlan(user, dto);
  }

  @Post('billing')
  @ApiCreatedResponse({ type: SaveOnboardingBillingResponseDto })
  saveBilling(@CurrentUser() user: AuthUser, @Body() dto: SaveOnboardingBillingDto) {
    return this.onboardingService.saveBilling(user, dto);
  }

  @Post('company-details')
  @ApiCreatedResponse({ type: SaveOnboardingCompanyDetailsResponseDto })
  saveCompanyDetails(@CurrentUser() user: AuthUser, @Body() dto: SaveOnboardingCompanyDetailsDto) {
    return this.onboardingService.saveCompanyDetails(user, dto);
  }

  @Post('complete')
  @ApiCreatedResponse({ type: CompleteOnboardingResponseDto })
  complete(@CurrentUser() user: AuthUser) {
    return this.onboardingService.complete(user);
  }
}
