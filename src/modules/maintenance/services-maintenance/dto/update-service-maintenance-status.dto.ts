import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { ChartAccountStatus } from '@prisma/client';

export class UpdateServiceMaintenanceStatusDto {
  @ApiProperty({ enum: ChartAccountStatus })
  @IsEnum(ChartAccountStatus)
  status!: ChartAccountStatus;
}
