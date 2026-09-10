import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsInt, IsOptional, IsString, Matches, Max, Min, MinLength, ValidateIf } from 'class-validator';
import { BillingMode } from '@prisma/client';

const NamePattern = /^[\p{L}\p{M}]+(?:[ .'-]+[\p{L}\p{M}]+)*$/u;

export class SaveOnboardingBillingDto {
  @ApiPropertyOptional({ enum: BillingMode, description: 'Billing mode for onboarding (MANUAL or AUTO)', default: BillingMode.AUTO })
  @IsOptional()
  @IsEnum(BillingMode)
  billingMode?: BillingMode;

  @ApiPropertyOptional({ description: 'Cardholder name (required for AUTO mode)', example: 'John Doe' })
  @ValidateIf((o: SaveOnboardingBillingDto) => o.billingMode !== BillingMode.MANUAL)
  @IsString()
  @MinLength(2)
  @Matches(NamePattern, { message: 'Cardholder name must contain letters only.' })
  cardholderName?: string;

  @ApiPropertyOptional({ description: 'Billing email', example: 'billing@company.com' })
  @ValidateIf((o: SaveOnboardingBillingDto) => o.billingMode !== BillingMode.MANUAL)
  @IsEmail({}, { message: 'Enter a valid billing email.' })
  billingEmail?: string;

  @ApiPropertyOptional({ description: 'Card last 4 digits (required for AUTO mode)', example: '4242' })
  @ValidateIf((o: SaveOnboardingBillingDto) => o.billingMode !== BillingMode.MANUAL)
  @IsString()
  @Matches(/^\d{4}$/, { message: 'Card last4 must contain exactly 4 digits.' })
  cardLast4?: string;

  @ApiPropertyOptional({ description: 'Card brand (required for AUTO mode)', example: 'visa' })
  @ValidateIf((o: SaveOnboardingBillingDto) => o.billingMode !== BillingMode.MANUAL)
  @IsString()
  @MinLength(2)
  cardBrand?: string;

  @ApiPropertyOptional({ description: 'Card expiry month (1-12, required for AUTO mode)', example: 12 })
  @ValidateIf((o: SaveOnboardingBillingDto) => o.billingMode !== BillingMode.MANUAL)
  @IsInt()
  @Min(1)
  @Max(12)
  expiryMonth?: number;

  @ApiPropertyOptional({ description: 'Card expiry year (required for AUTO mode)', example: 2028 })
  @ValidateIf((o: SaveOnboardingBillingDto) => o.billingMode !== BillingMode.MANUAL)
  @IsInt()
  @Min(2000)
  @Max(9999)
  expiryYear?: number;

  @ApiPropertyOptional({ description: 'Billing address (required for AUTO mode)', example: '123 Main St, City' })
  @ValidateIf((o: SaveOnboardingBillingDto) => o.billingMode !== BillingMode.MANUAL)
  @IsString()
  @MinLength(5)
  billingAddress?: string;

  @ApiPropertyOptional({ description: 'PayMongo payment method reference (required for AUTO mode)', example: 'pm_123456789' })
  @ValidateIf((o: SaveOnboardingBillingDto) => o.billingMode !== BillingMode.MANUAL)
  @IsString()
  @Matches(/^pm_[A-Za-z0-9]+$/, { message: 'Enter a valid PayMongo payment method reference.' })
  paymentMethodId?: string;
}
