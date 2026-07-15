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
  ChartAccountStatus,
  DefaultAccountTemplateType,
} from '@prisma/client';
import { toOptionalInt } from '../../../../common/utils/dto-transform.util';

export class GetDefaultAccountTemplateListQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @IsOptional()
  @IsEnum(DefaultAccountTemplateType)
  type?: DefaultAccountTemplateType;

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
  @IsIn(['name', 'description', 'type', 'status', 'createdAt', 'updatedAt'])
  sortBy?: 'name' | 'description' | 'type' | 'status' | 'createdAt' | 'updatedAt';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortDirection?: 'asc' | 'desc';
}

