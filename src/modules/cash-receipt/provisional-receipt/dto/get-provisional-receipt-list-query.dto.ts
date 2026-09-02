import { Type } from 'class-transformer';
import { IsIn, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class GetProvisionalReceiptListQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  branchUnitId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(['DRAFT', 'FOR_APPROVAL', 'DISAPPROVED', 'POSTED', 'CANCELLED'])
  status?: string;

  @IsOptional()
  @IsString()
  documentDateFrom?: string;

  @IsOptional()
  @IsString()
  documentDateTo?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  amountFrom?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  amountTo?: number;

  @IsOptional()
  @IsIn(['transactionNo', 'documentDate', 'customerName', 'receiptNo', 'referenceNo', 'grossAmount', 'status', 'createdAt', 'updatedAt'])
  sortBy?: string;

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortDirection?: 'asc' | 'desc';
}
