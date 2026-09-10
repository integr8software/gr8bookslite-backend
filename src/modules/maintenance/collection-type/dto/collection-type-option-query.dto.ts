import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ChartAccountStatus } from '@prisma/client';

export class CollectionTypeOptionQueryDto {
  @ApiPropertyOptional({ description: 'Search across collection type name, description, or generated revenue account', maxLength: 120, example: 'tuition' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @ApiPropertyOptional({ description: 'Collection type status filter', enum: ChartAccountStatus, example: ChartAccountStatus.ACTIVE })
  @IsOptional()
  @IsEnum(ChartAccountStatus)
  status?: ChartAccountStatus;
}
