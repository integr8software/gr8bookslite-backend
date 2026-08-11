import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BillingCycle, SubscriptionStatus } from '@prisma/client';

export class OnboardingPlanPriceSummaryResponseDto {
  @ApiProperty()
  amountInCents!: number;

  @ApiProperty()
  display!: string;
}

export class OnboardingPlanPricingResponseDto {
  @ApiProperty({ type: OnboardingPlanPriceSummaryResponseDto })
  monthly!: OnboardingPlanPriceSummaryResponseDto;

  @ApiProperty({ type: OnboardingPlanPriceSummaryResponseDto })
  yearly!: OnboardingPlanPriceSummaryResponseDto;

  @ApiProperty({ type: OnboardingPlanPriceSummaryResponseDto, nullable: true })
  monthlyCompareAt!: OnboardingPlanPriceSummaryResponseDto | null;

  @ApiProperty({ type: OnboardingPlanPriceSummaryResponseDto, nullable: true })
  yearlyCompareAt!: OnboardingPlanPriceSummaryResponseDto | null;
}

export class OnboardingPlanPriceResponseDto {
  @ApiProperty()
  id!: number;

  @ApiProperty({ enum: BillingCycle })
  billingCycle!: BillingCycle;

  @ApiProperty()
  intervalCount!: number;

  @ApiProperty()
  intervalUnit!: string;

  @ApiProperty()
  amountInCents!: number;

  @ApiProperty()
  display!: string;

  @ApiProperty({ nullable: true })
  compareAtInCents!: number | null;

  @ApiProperty({ nullable: true })
  compareAtDisplay!: string | null;

  @ApiProperty()
  isActive!: boolean;
}

export class OnboardingPlanUsageRuleResponseDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  metric!: string;

  @ApiProperty()
  freeCount!: number;

  @ApiProperty()
  unitPriceInCents!: number;

  @ApiProperty()
  unitPriceDisplay!: string;

  @ApiProperty()
  isActive!: boolean;
}

export class OnboardingPlanDiscountTierResponseDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  metric!: string;

  @ApiProperty()
  thresholdCount!: number;

  @ApiProperty()
  discountPercent!: number;

  @ApiProperty()
  isActive!: boolean;
}

export class OnboardingPlanModuleResponseDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  moduleKey!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  isEnabled!: boolean;
}

export class OnboardingPlanResponseDto {
  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ nullable: true })
  description!: string | null;

  @ApiProperty()
  trialDays!: number;

  @ApiProperty({ type: OnboardingPlanPricingResponseDto })
  pricing!: OnboardingPlanPricingResponseDto;

  @ApiProperty({ type: [OnboardingPlanPriceResponseDto] })
  prices!: OnboardingPlanPriceResponseDto[];

  @ApiProperty({ type: [OnboardingPlanUsageRuleResponseDto] })
  usageRules!: OnboardingPlanUsageRuleResponseDto[];

  @ApiProperty({ type: [OnboardingPlanDiscountTierResponseDto] })
  discountTiers!: OnboardingPlanDiscountTierResponseDto[];

  @ApiProperty({ type: [String] })
  moduleKeys!: string[];

  @ApiProperty({ type: [OnboardingPlanModuleResponseDto] })
  modules!: OnboardingPlanModuleResponseDto[];
}

export class OnboardingPlansResponseDto {
  @ApiProperty({ type: [OnboardingPlanResponseDto] })
  plans!: OnboardingPlanResponseDto[];
}

export class OnboardingDraftCompanyDetailsResponseDto {
  @ApiProperty({ nullable: true })
  taxpayerType!: 'individual' | 'non-individual' | null;

  @ApiProperty({ nullable: true })
  lastName!: string | null;

  @ApiProperty({ nullable: true })
  firstName!: string | null;

  @ApiProperty({ nullable: true })
  middleName!: string | null;

  @ApiProperty({ nullable: true })
  companyName!: string | null;

  @ApiProperty({ nullable: true })
  nonIndividualType!: string | null;

  @ApiProperty({ nullable: true })
  nonIndividualTypeOther!: string | null;

  @ApiProperty({ nullable: true })
  logoName!: string | null;

  @ApiProperty({ nullable: true })
  logoMimeType!: string | null;

  @ApiProperty({ nullable: true })
  logoStoragePath!: string | null;

  @ApiProperty({ nullable: true })
  logoPublicUrl!: string | null;

  @ApiProperty({ nullable: true })
  address!: string | null;

  @ApiProperty({ nullable: true })
  countryCode!: string | null;

  @ApiProperty({ nullable: true })
  baseCurrencyCode!: string | null;

  @ApiProperty({ nullable: true })
  tin!: string | null;

  @ApiProperty({ nullable: true })
  companyEmail!: string | null;

  @ApiProperty({ nullable: true })
  website!: string | null;

  @ApiProperty({ nullable: true })
  contactNumber!: string | null;

  @ApiProperty({ nullable: true })
  reportStartDate!: string | null;

  @ApiProperty({ nullable: true })
  reportEndDate!: string | null;
}

export class OnboardingDraftResponseDto {
  @ApiProperty({ type: OnboardingPlanResponseDto, nullable: true })
  plan!: OnboardingPlanResponseDto | null;

  @ApiProperty({ enum: BillingCycle, nullable: true })
  billingCycle!: BillingCycle | null;

  @ApiProperty({ nullable: true })
  cardholderName!: string | null;

  @ApiProperty({ nullable: true })
  billingEmail!: string | null;

  @ApiProperty({ nullable: true })
  billingAddress!: string | null;

  @ApiProperty({ nullable: true })
  cardLast4!: string | null;

  @ApiProperty({ nullable: true })
  cardBrand!: string | null;

  @ApiProperty({ nullable: true })
  cardExpiryMonth!: number | null;

  @ApiProperty({ nullable: true })
  cardExpiryYear!: number | null;

  @ApiProperty()
  hasBillingSetup!: boolean;

  @ApiProperty()
  hasCompanyDetails!: boolean;

  @ApiProperty({ nullable: true, format: 'date-time' })
  planSelectedAt!: Date | null;

  @ApiProperty({ nullable: true, format: 'date-time' })
  billingCompletedAt!: Date | null;

  @ApiProperty({ type: OnboardingDraftCompanyDetailsResponseDto })
  companyDetails!: OnboardingDraftCompanyDetailsResponseDto;
}

export class GetOnboardingDraftResponseDto {
  @ApiProperty({ type: OnboardingDraftResponseDto, nullable: true })
  draft!: OnboardingDraftResponseDto | null;
}

export class SelectOnboardingPlanResponseDto {
  @ApiProperty()
  message!: string;

  @ApiProperty({ type: OnboardingDraftResponseDto })
  draft!: Pick<OnboardingDraftResponseDto, 'plan' | 'billingCycle'>;
}

export class OnboardingBillingResponseDto {
  @ApiProperty({ nullable: true })
  planCode!: string | null;

  @ApiProperty({ enum: BillingCycle, nullable: true })
  billingCycle!: BillingCycle | null;

  @ApiProperty({ nullable: true })
  cardholderName!: string | null;

  @ApiProperty({ nullable: true })
  billingEmail!: string | null;

  @ApiProperty({ nullable: true })
  billingAddress!: string | null;

  @ApiProperty({ nullable: true })
  cardBrand!: string | null;

  @ApiProperty({ nullable: true })
  cardLast4!: string | null;

  @ApiProperty({ nullable: true })
  cardExpiryMonth!: number | null;

  @ApiProperty({ nullable: true })
  cardExpiryYear!: number | null;

  @ApiProperty({ type: OnboardingPlanResponseDto, nullable: true })
  plan!: OnboardingPlanResponseDto | null;

  @ApiProperty()
  trialDays!: number;
}

export class OnboardingPaymentIntentResponseDto {
  @ApiProperty({ nullable: true })
  id!: string | null;

  @ApiProperty({ nullable: true })
  status!: string | null;

  @ApiProperty({ nullable: true })
  redirectUrl!: string | null;
}

export class SaveOnboardingBillingResponseDto {
  @ApiProperty()
  message!: string;

  @ApiProperty({ type: OnboardingBillingResponseDto })
  billing!: OnboardingBillingResponseDto;

  @ApiPropertyOptional()
  pendingProviderActivation?: boolean;

  @ApiPropertyOptional({ enum: ['pending_provider_activation', 'ready_for_confirmation'] })
  paymentSetupState?: 'pending_provider_activation' | 'ready_for_confirmation';

  @ApiPropertyOptional({ type: OnboardingPaymentIntentResponseDto, nullable: true })
  paymentIntent?: OnboardingPaymentIntentResponseDto | null;

  @ApiProperty()
  nextStep!: string;
}

export class OnboardingCompanyDetailsResponseDto {
  @ApiProperty()
  taxpayerType!: 'individual' | 'non-individual';

  @ApiProperty({ nullable: true })
  lastName!: string | null;

  @ApiProperty({ nullable: true })
  firstName!: string | null;

  @ApiProperty({ nullable: true })
  middleName!: string | null;

  @ApiProperty({ nullable: true })
  companyName!: string | null;

  @ApiProperty({ nullable: true })
  nonIndividualType!: string | null;

  @ApiProperty({ nullable: true })
  nonIndividualTypeOther!: string | null;

  @ApiProperty()
  logoName!: string;

  @ApiProperty({ nullable: true })
  logoMimeType!: string | null;

  @ApiProperty({ nullable: true })
  logoStoragePath!: string | null;

  @ApiProperty({ nullable: true })
  logoPublicUrl!: string | null;

  @ApiProperty()
  address!: string;

  @ApiProperty()
  tin!: string;

  @ApiProperty()
  companyEmail!: string;

  @ApiProperty({ nullable: true })
  website!: string | null;

  @ApiProperty()
  contactNumber!: string;

  @ApiProperty()
  countryCode!: string;

  @ApiProperty()
  baseCurrencyCode!: string;

  @ApiProperty()
  reportStartDate!: string;

  @ApiProperty()
  reportEndDate!: string;
}

export class SaveOnboardingCompanyDetailsResponseDto {
  @ApiProperty()
  message!: string;

  @ApiProperty({ type: OnboardingCompanyDetailsResponseDto })
  companyDetails!: OnboardingCompanyDetailsResponseDto;

  @ApiProperty()
  nextStep!: string;
}

export class OnboardingCompanyResponseDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty()
  status!: string;
}

export class OnboardingSubscriptionResponseDto {
  @ApiProperty()
  id!: number;

  @ApiProperty({ type: OnboardingPlanResponseDto })
  plan!: OnboardingPlanResponseDto;

  @ApiProperty({ enum: BillingCycle })
  billingCycle!: BillingCycle;

  @ApiProperty({ enum: SubscriptionStatus })
  status!: SubscriptionStatus;

  @ApiProperty({ format: 'date-time', nullable: true })
  startsAt!: Date | null;

  @ApiProperty({ format: 'date-time', nullable: true })
  trialEndsAt!: Date | null;
}

export class CompleteOnboardingResponseDto {
  @ApiProperty()
  message!: string;

  @ApiProperty({ type: OnboardingCompanyResponseDto })
  company!: OnboardingCompanyResponseDto;

  @ApiProperty({ type: OnboardingSubscriptionResponseDto })
  subscription!: OnboardingSubscriptionResponseDto;

  @ApiProperty()
  nextStep!: 'APP_READY';

  @ApiProperty()
  requiresReauthentication!: boolean;

  @ApiPropertyOptional()
  accessToken?: string;
}

export class OnboardingLogoResponseDto {
  @ApiProperty()
  fileName!: string;

  @ApiProperty()
  mimeType!: string;

  @ApiProperty()
  storagePath!: string;

  @ApiProperty()
  publicUrl!: string;
}

export class UploadOnboardingCompanyLogoResponseDto {
  @ApiProperty()
  message!: string;

  @ApiProperty({ type: OnboardingLogoResponseDto })
  logo!: OnboardingLogoResponseDto;
}
