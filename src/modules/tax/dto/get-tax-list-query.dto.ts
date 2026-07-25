import { Transform } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { TaxMaintenanceStatus } from '@prisma/client';
import { toOptionalInt } from '../../../common/utils/dto-transform.util';

export class GetTaxListQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @IsOptional()
  @IsEnum(TaxMaintenanceStatus)
  status?: TaxMaintenanceStatus;

  @IsOptional()
  @Transform(({ value }) => toOptionalInt(value))
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Transform(({ value }) => toOptionalInt(value))
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number;

  @IsOptional()
  @IsIn(['sortOrder', 'code', 'name', 'jurisdictionCode', 'taxSystem', 'treatment', 'transactionScope', 'percentage', 'status', 'createdAt', 'updatedAt'])
  sortBy?:
    | 'sortOrder'
    | 'code'
    | 'name'
    | 'jurisdictionCode'
    | 'taxSystem'
    | 'treatment'
    | 'transactionScope'
    | 'percentage'
    | 'status'
    | 'createdAt'
    | 'updatedAt';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortDirection?: 'asc' | 'desc';
}
