import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ChartAccountStatus } from '@prisma/client';

export class DisbursementTypeOptionQueryDto {
  @ApiPropertyOptional({ description: 'Search across disbursement type name, description, or generated expense account', maxLength: 120, example: 'supplies' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @ApiPropertyOptional({ description: 'Disbursement type status filter', enum: ChartAccountStatus, example: ChartAccountStatus.ACTIVE })
  @IsOptional()
  @IsEnum(ChartAccountStatus)
  status?: ChartAccountStatus;
}
