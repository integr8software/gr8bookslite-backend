import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  BillingCycle,
  BillingProvider,
  SubscriptionStatus,
} from '@prisma/client';

export class BillingPlanPriceResponseDto {
  @ApiProperty()
  amountInCents!: number | null;

  @ApiProperty()
  compareAtInCents!: number | null;

  @ApiProperty()
  isRemoteReady!: boolean;
}

export class BillingPlanDetailedPriceResponseDto extends BillingPlanPriceResponseDto {
  @ApiProperty()
  id!: number;

  @ApiProperty({ enum: BillingCycle })
  billingCycle!: BillingCycle;

  @ApiProperty()
  intervalCount!: number;

  @ApiProperty()
  intervalUnit!: string;

  @ApiProperty()
  isActive!: boolean;
}

export class BillingPlanUsageRuleResponseDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  metric!: string;

  @ApiProperty()
  freeCount!: number;

  @ApiProperty()
  unitPriceInCents!: number;

  @ApiPropertyOptional()
  isActive?: boolean;
}

export class BillingPlanDiscountTierResponseDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  metric!: string;

  @ApiProperty()
  thresholdCount!: number;

  @ApiProperty()
  discountPercent!: number;

  @ApiPropertyOptional()
  isActive?: boolean;
}

export class BillingPlanModuleResponseDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  moduleKey!: string;

  @ApiProperty()
  isEnabled!: boolean;
}

export class BillingPlanPricingResponseDto {
  @ApiProperty({ type: BillingPlanPriceResponseDto })
  monthly!: BillingPlanPriceResponseDto;

  @ApiProperty({ type: BillingPlanPriceResponseDto })
  yearly!: BillingPlanPriceResponseDto;
}

export class BillingPlanResponseDto {
  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ nullable: true })
  description!: string | null;

  @ApiProperty()
  currency!: string;

  @ApiProperty()
  scope!: string;

  @ApiProperty()
  trialDays!: number;

  @ApiProperty({ type: BillingPlanPricingResponseDto })
  pricing!: BillingPlanPricingResponseDto;

  @ApiProperty({ type: [BillingPlanDetailedPriceResponseDto] })
  prices!: BillingPlanDetailedPriceResponseDto[];

  @ApiProperty({ type: [BillingPlanUsageRuleResponseDto] })
  usageRules!: BillingPlanUsageRuleResponseDto[];

  @ApiProperty({ type: [BillingPlanDiscountTierResponseDto] })
  discountTiers!: BillingPlanDiscountTierResponseDto[];

  @ApiProperty({ type: [String] })
  moduleKeys!: string[];

  @ApiProperty({ type: [BillingPlanModuleResponseDto] })
  modules!: BillingPlanModuleResponseDto[];
}

export class BillingPlansResponseDto {
  @ApiProperty({ type: [BillingPlanResponseDto] })
  plans!: BillingPlanResponseDto[];
}

export class BillingCustomerResponseDto {
  @ApiProperty()
  id!: number;

  @ApiProperty({ nullable: true })
  email!: string | null;

  @ApiProperty({ nullable: true })
  name!: string | null;

  @ApiProperty({ nullable: true })
  phone!: string | null;

  @ApiProperty({ nullable: true })
  externalCustomerId!: string | null;
}

export class BillingPaymentMethodResponseDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  type!: string;

  @ApiProperty({ nullable: true })
  brand!: string | null;

  @ApiProperty({ nullable: true })
  last4!: string | null;

  @ApiProperty({ nullable: true })
  expMonth!: number | null;

  @ApiProperty({ nullable: true })
  expYear!: number | null;

  @ApiProperty()
  isDefault!: boolean;

  @ApiProperty()
  externalPaymentMethodId!: string;
}

export class BillingPaymentMethodCompanyResponseDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  name!: string;
}

export class BillingPaymentMethodSubscriptionPlanResponseDto {
  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;
}

export class BillingPaymentMethodSubscriptionResponseDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  status!: string;

  @ApiProperty({ type: BillingPaymentMethodSubscriptionPlanResponseDto })
  plan!: BillingPaymentMethodSubscriptionPlanResponseDto;
}

export class BillingSavedPaymentMethodResponseDto extends BillingPaymentMethodResponseDto {
  @ApiProperty({ type: BillingPaymentMethodCompanyResponseDto })
  company!: BillingPaymentMethodCompanyResponseDto;

  @ApiProperty({
    type: BillingPaymentMethodSubscriptionResponseDto,
    nullable: true,
  })
  subscription!: BillingPaymentMethodSubscriptionResponseDto | null;
}

export class BillingPaymentMethodsResponseDto {
  @ApiProperty({ type: [BillingSavedPaymentMethodResponseDto] })
  paymentMethods!: BillingSavedPaymentMethodResponseDto[];
}

export class BillingInvoiceResponseDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  externalInvoiceId!: string;

  @ApiProperty({ nullable: true })
  externalPaymentIntentId!: string | null;

  @ApiProperty()
  status!: string;

  @ApiProperty({ nullable: true })
  billingReason!: string | null;

  @ApiProperty({ nullable: true })
  currency!: string | null;

  @ApiProperty({ nullable: true })
  amountDueInCents!: number | null;

  @ApiProperty({ nullable: true })
  amountPaidInCents!: number | null;

  @ApiProperty({ nullable: true })
  dueAt!: Date | null;

  @ApiProperty({ nullable: true })
  paidAt!: Date | null;

  @ApiProperty({ nullable: true })
  finalizedAt!: Date | null;

  @ApiProperty({ nullable: true })
  periodStartAt!: Date | null;

  @ApiProperty({ nullable: true })
  periodEndAt!: Date | null;
}

export class CompanySubscriptionProviderReferencesResponseDto {
  @ApiProperty({ nullable: true })
  customerId!: string | null;

  @ApiProperty({ nullable: true })
  subscriptionId!: string | null;

  @ApiProperty({ nullable: true })
  planId!: string | null;

  @ApiProperty({ nullable: true })
  paymentMethodId!: string | null;

  @ApiProperty({ nullable: true })
  latestInvoiceId!: string | null;

  @ApiProperty({ nullable: true })
  latestPaymentIntentId!: string | null;
}

export class CompanySubscriptionSelectedPriceResponseDto {
  @ApiProperty()
  id!: number;

  @ApiProperty({ enum: BillingCycle })
  billingCycle!: BillingCycle;

  @ApiProperty()
  intervalCount!: number;

  @ApiProperty()
  intervalUnit!: string;

  @ApiProperty()
  priceInCents!: number;

  @ApiProperty({ nullable: true })
  compareAtInCents!: number | null;
}

export class CompanySubscriptionPlanResponseDto {
  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ nullable: true })
  description!: string | null;

  @ApiProperty()
  currency!: string;

  @ApiProperty()
  trialDays!: number;

  @ApiProperty({ nullable: true })
  monthlyPriceInCents!: number | null;

  @ApiProperty({ nullable: true })
  yearlyPriceInCents!: number | null;

  @ApiProperty({
    type: CompanySubscriptionSelectedPriceResponseDto,
    nullable: true,
  })
  selectedPrice!: CompanySubscriptionSelectedPriceResponseDto | null;

  @ApiProperty({ type: [CompanySubscriptionSelectedPriceResponseDto] })
  prices!: CompanySubscriptionSelectedPriceResponseDto[];

  @ApiProperty({ type: [BillingPlanUsageRuleResponseDto] })
  usageRules!: BillingPlanUsageRuleResponseDto[];

  @ApiProperty({ type: [BillingPlanDiscountTierResponseDto] })
  discountTiers!: BillingPlanDiscountTierResponseDto[];

  @ApiProperty({ type: [String] })
  moduleKeys!: string[];

  @ApiProperty({ type: [BillingPlanModuleResponseDto] })
  modules!: BillingPlanModuleResponseDto[];
}

export class CompanySubscriptionResponseDto {
  @ApiProperty()
  id!: number;

  @ApiProperty({ enum: SubscriptionStatus })
  status!: SubscriptionStatus;

  @ApiProperty({ enum: BillingCycle })
  billingCycle!: BillingCycle;

  @ApiProperty({ enum: BillingProvider })
  billingProvider!: BillingProvider;

  @ApiProperty({ nullable: true })
  startsAt!: Date | null;

  @ApiProperty({ nullable: true })
  trialEndsAt!: Date | null;

  @ApiProperty({ nullable: true })
  currentPeriodStartAt!: Date | null;

  @ApiProperty({ nullable: true })
  nextBillingAt!: Date | null;

  @ApiProperty({ nullable: true })
  endsAt!: Date | null;

  @ApiProperty({ nullable: true })
  canceledAt!: Date | null;

  @ApiProperty()
  cancelAtPeriodEnd!: boolean;

  @ApiProperty({ nullable: true })
  failureCode!: string | null;

  @ApiProperty({ nullable: true })
  failureMessage!: string | null;

  @ApiProperty({ type: CompanySubscriptionProviderReferencesResponseDto })
  providerReferences!: CompanySubscriptionProviderReferencesResponseDto;

  @ApiProperty({ type: CompanySubscriptionPlanResponseDto })
  plan!: CompanySubscriptionPlanResponseDto;

  @ApiProperty({ type: BillingCustomerResponseDto, nullable: true })
  billingCustomer!: BillingCustomerResponseDto | null;

  @ApiProperty({ type: [BillingPaymentMethodResponseDto] })
  paymentMethods!: BillingPaymentMethodResponseDto[];

  @ApiProperty({ type: [BillingInvoiceResponseDto] })
  invoices!: BillingInvoiceResponseDto[];
}

export class CurrentSubscriptionResponseDto {
  @ApiProperty({ type: CompanySubscriptionResponseDto, nullable: true })
  subscription!: CompanySubscriptionResponseDto | null;
}

export class BillingSubscriptionSetupResponseDto extends BillingPlansResponseDto {
  @ApiProperty({ type: CompanySubscriptionResponseDto, nullable: true })
  subscription!: CompanySubscriptionResponseDto | null;
}

export class SubscribeCompanyResponseDto {
  @ApiProperty()
  message!: string;

  @ApiProperty({ type: CompanySubscriptionResponseDto })
  subscription!: CompanySubscriptionResponseDto;
}

export class PaymentIntentResponseDto {
  @ApiProperty({ nullable: true })
  id!: string | null;

  @ApiProperty({ nullable: true })
  status!: string | null;

  @ApiProperty({ nullable: true })
  redirectUrl!: string | null;
}

export class AttachPaymentMethodResponseDto extends SubscribeCompanyResponseDto {
  @ApiProperty({ type: PaymentIntentResponseDto })
  paymentIntent!: PaymentIntentResponseDto;

  @ApiPropertyOptional()
  pendingProviderActivation?: boolean;
}

export class CancelSubscriptionResponseDto extends SubscribeCompanyResponseDto {}
