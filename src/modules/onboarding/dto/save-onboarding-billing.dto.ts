import { IsEmail, IsEnum, IsInt, IsOptional, IsString, Matches, Max, Min, MinLength, ValidateIf } from 'class-validator';
import { BillingMode } from '@prisma/client';

const NamePattern = /^[\p{L}\p{M}]+(?:[ .'-]+[\p{L}\p{M}]+)*$/u;

export class SaveOnboardingBillingDto {
  @IsOptional()
  @IsEnum(BillingMode)
  billingMode?: BillingMode;

  @ValidateIf((o: SaveOnboardingBillingDto) => o.billingMode !== BillingMode.MANUAL)
  @IsString()
  @MinLength(2)
  @Matches(NamePattern, {
    message: 'Cardholder name must contain letters only.',
  })
  cardholderName?: string;

  @ValidateIf((o: SaveOnboardingBillingDto) => o.billingMode !== BillingMode.MANUAL)
  @IsEmail()
  billingEmail?: string;

  @ValidateIf((o: SaveOnboardingBillingDto) => o.billingMode !== BillingMode.MANUAL)
  @IsString()
  @Matches(/^\d{4}$/, {
    message: 'Card last4 must contain exactly 4 digits.',
  })
  cardLast4?: string;

  @ValidateIf((o: SaveOnboardingBillingDto) => o.billingMode !== BillingMode.MANUAL)
  @IsString()
  @MinLength(2)
  cardBrand?: string;

  @ValidateIf((o: SaveOnboardingBillingDto) => o.billingMode !== BillingMode.MANUAL)
  @IsInt()
  @Min(1)
  @Max(12)
  expiryMonth?: number;

  @ValidateIf((o: SaveOnboardingBillingDto) => o.billingMode !== BillingMode.MANUAL)
  @IsInt()
  @Min(2000)
  @Max(9999)
  expiryYear?: number;

  @ValidateIf((o: SaveOnboardingBillingDto) => o.billingMode !== BillingMode.MANUAL)
  @IsString()
  @MinLength(5)
  billingAddress?: string;

  @ValidateIf((o: SaveOnboardingBillingDto) => o.billingMode !== BillingMode.MANUAL)
  @IsString()
  @Matches(/^pm_[A-Za-z0-9]+$/, {
    message: 'Enter a valid PayMongo payment method reference.',
  })
  paymentMethodId?: string;
}

