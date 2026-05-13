import { BillingCycle } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';

export class SubscribeCompanyDto {
  @IsString()
  @IsNotEmpty()
  planCode!: string;

  @IsEnum(BillingCycle)
  billingCycle!: BillingCycle;
}
