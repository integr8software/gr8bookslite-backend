import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { RevolvingFundStatus } from '@prisma/client';

export class GetRevolvingFundListQueryDto {
  @ApiPropertyOptional({ description: 'Page number', default: 1, example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Limit per page', default: 10, example: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number;

  @ApiPropertyOptional({ description: 'Search term', example: 'RF-2026' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Status filter', enum: RevolvingFundStatus })
  @IsOptional()
  @IsEnum(RevolvingFundStatus)
  status?: RevolvingFundStatus;

  @ApiPropertyOptional({ description: 'Party code filter', example: 'EMP-001' })
  @IsOptional()
  @IsString()
  partyCode?: string;

  @ApiPropertyOptional({ description: 'Start date filter (YYYY-MM-DD)', example: '2026-01-01' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date filter (YYYY-MM-DD)', example: '2026-12-31' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Minimum amount filter', example: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  amountFrom?: number;

  @ApiPropertyOptional({ description: 'Maximum amount filter', example: 50000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  amountTo?: number;

  @ApiPropertyOptional({ description: 'Branch Unit ID filter', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  branchUnitId?: number;

  @ApiPropertyOptional({ description: 'Sort column', example: 'transactionNo' })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ description: 'Sort direction', enum: ['asc', 'desc'], example: 'desc' })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc';
}
