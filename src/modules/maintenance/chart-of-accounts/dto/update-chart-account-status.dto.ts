import { IsEnum } from 'class-validator';
import { ChartAccountStatus } from '@prisma/client';

export class UpdateChartAccountStatusDto {
  @IsEnum(ChartAccountStatus)
  status!: ChartAccountStatus;
}
