import { BillingCycle } from '@prisma/client';
import { IsEnum, IsString, MinLength } from 'class-validator';

export class SelectOnboardingPlanDto {
  @IsString()
  @MinLength(1)
  planCode!: string;

  @IsEnum(BillingCycle)
  billingCycle!: BillingCycle;
}
