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
  ResponsibilityCenterCategory,
  ResponsibilityCenterFinancialType,
  ResponsibilityCenterStatus,
} from '@prisma/client';

export class GetResponsibilityCenterListQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @IsOptional()
  @IsEnum(ResponsibilityCenterStatus)
  status?: ResponsibilityCenterStatus;

  @IsOptional()
  @IsEnum(ResponsibilityCenterCategory)
  category?: ResponsibilityCenterCategory;

  @IsOptional()
  @IsEnum(ResponsibilityCenterFinancialType)
  financialType?: ResponsibilityCenterFinancialType;

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
    'code',
    'name',
    'category',
    'financialType',
    'manager',
    'status',
    'createdAt',
    'updatedAt',
  ])
  sortBy?:
    | 'code'
    | 'name'
    | 'category'
    | 'financialType'
    | 'manager'
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
