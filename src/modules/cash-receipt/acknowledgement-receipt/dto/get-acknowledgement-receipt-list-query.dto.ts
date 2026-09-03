import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

const AcknowledgementReceiptSortByOptions = [
  'transactionNo',
  'documentDate',
  'customerName',
  'receiptNo',
  'referenceNo',
  'grossAmount',
  'status',
  'createdAt',
  'updatedAt',
] as const;
const SortDirectionOptions = ['asc', 'desc'] as const;

export class GetAcknowledgementReceiptListQueryDto {
  @ApiPropertyOptional({ example: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  branchUnitId?: number;

  @ApiPropertyOptional({ example: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 10, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;

  @ApiPropertyOptional({ example: 'Acme' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: ['DRAFT', 'FOR_APPROVAL', 'DISAPPROVED', 'POSTED', 'CANCELLED'] })
  @IsOptional()
  @IsIn(['DRAFT', 'FOR_APPROVAL', 'DISAPPROVED', 'POSTED', 'CANCELLED'])
  status?: string;

  @ApiPropertyOptional({ example: '2026-09-01', format: 'date' })
  @IsOptional()
  @IsString()
  documentDateFrom?: string;

  @ApiPropertyOptional({ example: '2026-09-30', format: 'date' })
  @IsOptional()
  @IsString()
  documentDateTo?: string;

  @ApiPropertyOptional({ example: 1000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  amountFrom?: number;

  @ApiPropertyOptional({ example: 50000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  amountTo?: number;

  @ApiPropertyOptional({ enum: AcknowledgementReceiptSortByOptions })
  @IsOptional()
  @IsIn(AcknowledgementReceiptSortByOptions)
  sortBy?: string;

  @ApiPropertyOptional({ enum: SortDirectionOptions })
  @IsOptional()
  @IsIn(SortDirectionOptions)
  sortDirection?: 'asc' | 'desc';
}
