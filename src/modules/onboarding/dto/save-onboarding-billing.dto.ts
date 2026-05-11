import {
  IsEmail,
  IsInt,
  IsString,
  Matches,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export class SaveOnboardingBillingDto {
  @IsString()
  @MinLength(2)
  @Matches(/^[A-Za-z]+(?:[ .'-]+[A-Za-z]+)*$/, {
    message: 'Cardholder name must contain letters only.',
  })
  cardholderName!: string;

  @IsEmail()
  billingEmail!: string;

  @IsString()
  @Matches(/^\d[\d -]*\d$|^\d$/, {
    message: 'Card number can only contain digits, spaces, and hyphens.',
  })
  cardNumber!: string;

  @IsInt()
  @Min(1)
  @Max(12)
  expiryMonth!: number;

  @IsInt()
  @Min(2000)
  @Max(9999)
  expiryYear!: number;

  @IsString()
  @Matches(/^\d{3,4}$/, {
    message: 'Enter a valid CVC.',
  })
  cvc!: string;

  @IsString()
  @MinLength(5)
  billingAddress!: string;
}
