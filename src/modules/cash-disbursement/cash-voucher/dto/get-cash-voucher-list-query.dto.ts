import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class GetCashVoucherListQueryDto {
  @ApiPropertyOptional({ description: 'Page number', default: 1, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 20, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Branch Unit ID filter' })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  branchUnitId?: number;

  @ApiPropertyOptional({ description: 'Free-text search (voucherNo, partyName, partyCode, remarks)' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by Status (DRAFT, FOR_APPROVAL, APPROVED, POSTED, DISAPPROVED, CANCELLED, CLOSED)' })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ description: 'Filter by Party Code' })
  @IsString()
  @IsOptional()
  partyCode?: string;

  @ApiPropertyOptional({ description: 'Start Date (YYYY-MM-DD)' })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End Date (YYYY-MM-DD)' })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Minimum Amount' })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  amountFrom?: number;

  @ApiPropertyOptional({ description: 'Maximum Amount' })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  amountTo?: number;

  @ApiPropertyOptional({
    description: 'Field to sort by',
    enum: ['voucherNo', 'voucherDate', 'partyName', 'partyCode', 'amount', 'currencyCode', 'status', 'createdAt', 'updatedAt'],
    default: 'createdAt',
  })
  @IsString()
  @IsOptional()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({ description: 'Sort direction', enum: ['asc', 'desc'], default: 'desc' })
  @IsIn(['asc', 'desc'])
  @IsOptional()
  sortOrder?: 'asc' | 'desc' = 'desc';
}
