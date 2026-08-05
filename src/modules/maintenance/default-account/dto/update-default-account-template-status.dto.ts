import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { ChartAccountStatus } from '@prisma/client';

export class UpdateDefaultAccountTemplateStatusDto {
  @ApiProperty({ enum: ChartAccountStatus })
  @IsEnum(ChartAccountStatus)
  status!: ChartAccountStatus;
}
