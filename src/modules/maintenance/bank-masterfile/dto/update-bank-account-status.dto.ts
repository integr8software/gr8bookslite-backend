import { IsEnum } from 'class-validator';
import { ChartAccountStatus } from '@prisma/client';

export class UpdateBankAccountStatusDto {
  @IsEnum(ChartAccountStatus)
  status!: ChartAccountStatus;
}
