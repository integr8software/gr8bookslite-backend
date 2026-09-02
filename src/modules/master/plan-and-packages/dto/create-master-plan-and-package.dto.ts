import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { BillingCycle, BillingIntervalUnit, SubscriptionPlanScope, SubscriptionPlanStatus, SubscriptionUsageMetric } from '@prisma/client';

export class MasterPlanPriceDto {
  @ApiProperty({ enum: BillingCycle })
  @IsEnum(BillingCycle)
  billingCycle!: BillingCycle;

  @ApiProperty({ minimum: 1, type: Number })
  @IsInt()
  @Min(1)
  intervalCount!: number;

  @ApiProperty({ enum: BillingIntervalUnit })
  @IsEnum(BillingIntervalUnit)
  intervalUnit!: BillingIntervalUnit;

  @ApiProperty({ minimum: 0, type: Number })
  @IsInt()
  @Min(0)
  priceInCents!: number;

  @ApiPropertyOptional({ minimum: 0, nullable: true, type: Number })
  @IsOptional()
  @IsInt()
  @Min(0)
  compareAtInCents?: number | null;
}

export class MasterPlanUsageRuleDto {
  @ApiProperty({ enum: SubscriptionUsageMetric })
  @IsEnum(SubscriptionUsageMetric)
  metric!: SubscriptionUsageMetric;

  @ApiProperty({ minimum: 0, type: Number })
  @IsInt()
  @Min(0)
  freeCount!: number;

  @ApiProperty({ minimum: 0, type: Number })
  @IsInt()
  @Min(0)
  unitPriceInCents!: number;
}

export class MasterPlanDiscountTierDto {
  @ApiProperty({ enum: SubscriptionUsageMetric })
  @IsEnum(SubscriptionUsageMetric)
  metric!: SubscriptionUsageMetric;

  @ApiProperty({ minimum: 1, type: Number })
  @IsInt()
  @Min(1)
  thresholdCount!: number;

  @ApiProperty({ minimum: 0, maximum: 100, type: Number })
  @IsInt()
  @Min(0)
  @Max(100)
  discountPercent!: number;
}

export class CreateMasterPlanAndPackageDto {
  @ApiPropertyOptional({ maxLength: 64, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  code?: string | null;

  @ApiProperty({ minLength: 3, maxLength: 160 })
  @IsString()
  @MinLength(3)
  @MaxLength(160)
  name!: string;

  @ApiPropertyOptional({ maxLength: 1000, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string | null;

  @ApiPropertyOptional({ enum: SubscriptionPlanScope })
  @IsOptional()
  @IsEnum(SubscriptionPlanScope)
  scope?: SubscriptionPlanScope;

  @ApiPropertyOptional({ enum: SubscriptionPlanScope, isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(SubscriptionPlanScope, { each: true })
  scopes?: SubscriptionPlanScope[];

  @ApiProperty({ enum: SubscriptionPlanStatus })
  @IsEnum(SubscriptionPlanStatus)
  status!: SubscriptionPlanStatus;

  @ApiProperty({ minimum: 0, maximum: 365, type: Number })
  @IsInt()
  @Min(0)
  @Max(365)
  trialDays!: number;

  @ApiPropertyOptional({ minimum: 0, type: Number })
  @IsOptional()
  @IsInt()
  @Min(0)
  trialPriceInCents?: number;

  @ApiProperty({ type: () => [MasterPlanPriceDto] })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => MasterPlanPriceDto)
  prices!: MasterPlanPriceDto[];

  @ApiPropertyOptional({ type: () => [MasterPlanUsageRuleDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MasterPlanUsageRuleDto)
  usageRules?: MasterPlanUsageRuleDto[];

  @ApiPropertyOptional({ type: () => [MasterPlanDiscountTierDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MasterPlanDiscountTierDto)
  discountTiers?: MasterPlanDiscountTierDto[];

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  systemCodes!: string[];
}
