import { BillingCycle, BillingPaymentPurpose } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Min,
} from 'class-validator';

export class CreateManualCheckoutSessionDto {
  @IsEnum(BillingPaymentPurpose)
  purpose!: BillingPaymentPurpose;

  @IsString()
  planCode!: string;

  @IsEnum(BillingCycle)
  billingCycle!: BillingCycle;

  @IsOptional()
  @IsInt()
  @Min(1)
  companyId?: number;

  @IsUrl({ require_tld: false })
  successUrl!: string;

  @IsUrl({ require_tld: false })
  cancelUrl!: string;
}
