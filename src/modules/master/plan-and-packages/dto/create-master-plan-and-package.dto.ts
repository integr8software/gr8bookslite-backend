import {
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  BillingCycle,
  BillingIntervalUnit,
  SubscriptionPlanScope,
  SubscriptionPlanStatus,
  SubscriptionUsageMetric,
} from '@prisma/client';

export class MasterPlanPriceDto {
  @IsEnum(BillingCycle)
  billingCycle!: BillingCycle;

  @IsInt()
  @Min(1)
  intervalCount!: number;

  @IsEnum(BillingIntervalUnit)
  intervalUnit!: BillingIntervalUnit;

  @IsInt()
  @Min(0)
  priceInCents!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  compareAtInCents?: number | null;
}

export class MasterPlanUsageRuleDto {
  @IsEnum(SubscriptionUsageMetric)
  metric!: SubscriptionUsageMetric;

  @IsInt()
  @Min(0)
  freeCount!: number;

  @IsInt()
  @Min(0)
  unitPriceInCents!: number;
}

export class MasterPlanDiscountTierDto {
  @IsEnum(SubscriptionUsageMetric)
  metric!: SubscriptionUsageMetric;

  @IsInt()
  @Min(1)
  thresholdCount!: number;

  @IsInt()
  @Min(0)
  @Max(100)
  discountPercent!: number;
}

export class CreateMasterPlanAndPackageDto {
  @IsString()
  @MinLength(2)
  @MaxLength(64)
  code!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(160)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string | null;

  @IsEnum(SubscriptionPlanScope)
  scope!: SubscriptionPlanScope;

  @IsEnum(SubscriptionPlanStatus)
  status!: SubscriptionPlanStatus;

  @IsInt()
  @Min(0)
  @Max(365)
  trialDays!: number;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => MasterPlanPriceDto)
  prices!: MasterPlanPriceDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MasterPlanUsageRuleDto)
  usageRules!: MasterPlanUsageRuleDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MasterPlanDiscountTierDto)
  discountTiers!: MasterPlanDiscountTierDto[];

  @IsArray()
  @IsString({ each: true })
  systemCodes!: string[];
}
