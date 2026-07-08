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
  DiscountStatus,
  DiscountType,
  DiscountValueType,
} from '@prisma/client';

export class GetDiscountListQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @IsOptional()
  @IsEnum(DiscountType)
  type?: DiscountType;

  @IsOptional()
  @IsEnum(DiscountValueType)
  valueType?: DiscountValueType;

  @IsOptional()
  @IsEnum(DiscountStatus)
  status?: DiscountStatus;

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
    'type',
    'valueType',
    'value',
    'status',
    'createdAt',
    'updatedAt',
  ])
  sortBy?:
    | 'name'
    | 'type'
    | 'valueType'
    | 'value'
    | 'status'
    | 'createdAt'
    | 'updatedAt';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortDirection?: 'asc' | 'desc';
}

function toOptionalInt(value: unknown) {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  return Number(value);
}
