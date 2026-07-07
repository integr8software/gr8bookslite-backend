import { IsEnum } from 'class-validator';
import { ChartAccountStatus } from '@prisma/client';

export class UpdateDefaultAccountTemplateStatusDto {
  @IsEnum(ChartAccountStatus)
  status!: ChartAccountStatus;
}
