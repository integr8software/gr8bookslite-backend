import { IsEmail, IsInt, IsString, Matches, Max, Min, MinLength } from 'class-validator';

const NamePattern = /^[\p{L}\p{M}]+(?:[ .'-]+[\p{L}\p{M}]+)*$/u;

export class SaveOnboardingBillingDto {
  @IsString()
  @MinLength(2)
  @Matches(NamePattern, {
    message: 'Cardholder name must contain letters only.',
  })
  cardholderName!: string;

  @IsEmail()
  billingEmail!: string;

  @IsString()
  @Matches(/^\d{4}$/, {
    message: 'Card last4 must contain exactly 4 digits.',
  })
  cardLast4!: string;

  @IsString()
  @MinLength(2)
  cardBrand!: string;

  @IsInt()
  @Min(1)
  @Max(12)
  expiryMonth!: number;

  @IsInt()
  @Min(2000)
  @Max(9999)
  expiryYear!: number;

  @IsString()
  @MinLength(5)
  billingAddress!: string;

  @IsString()
  @Matches(/^pm_[A-Za-z0-9]+$/, {
    message: 'Enter a valid PayMongo payment method reference.',
  })
  paymentMethodId!: string;
}
