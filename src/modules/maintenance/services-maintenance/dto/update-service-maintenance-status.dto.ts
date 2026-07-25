import { IsEnum } from 'class-validator';
import { ChartAccountStatus } from '@prisma/client';

export class UpdateServiceMaintenanceStatusDto {
  @IsEnum(ChartAccountStatus)
  status!: ChartAccountStatus;
}
