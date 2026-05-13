import { IsBoolean, IsOptional } from 'class-validator';

export class CancelCompanySubscriptionDto {
  @IsOptional()
  @IsBoolean()
  cancelAtPeriodEnd?: boolean;
}
