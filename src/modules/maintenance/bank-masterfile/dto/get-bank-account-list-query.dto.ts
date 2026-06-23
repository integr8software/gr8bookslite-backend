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
import { ChartAccountStatus } from '@prisma/client';

export class GetBankAccountListQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @IsOptional()
  @IsEnum(ChartAccountStatus)
  status?: ChartAccountStatus;

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
    'bankName',
    'branch',
    'accountName',
    'accountNumber',
    'status',
    'createdAt',
    'updatedAt',
  ])
  sortBy?:
    | 'bankName'
    | 'branch'
    | 'accountName'
    | 'accountNumber'
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
