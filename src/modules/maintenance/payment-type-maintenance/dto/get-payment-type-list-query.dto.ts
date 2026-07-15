import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  PaymentTypeClassification,
  PaymentTypeStatus,
} from '@prisma/client';
import { toOptionalInt } from '../../../../common/utils/dto-transform.util';

export class GetPaymentTypeListQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @IsOptional()
  @IsEnum(PaymentTypeClassification)
  classification?: PaymentTypeClassification;

  @IsOptional()
  @IsEnum(PaymentTypeStatus)
  status?: PaymentTypeStatus;

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
  @IsIn([
    'name',
    'classification',
    'sortOrder',
    'status',
    'createdAt',
    'updatedAt',
  ])
  sortBy?:
    | 'name'
    | 'classification'
    | 'sortOrder'
    | 'status'
    | 'createdAt'
    | 'updatedAt';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortDirection?: 'asc' | 'desc';
}

