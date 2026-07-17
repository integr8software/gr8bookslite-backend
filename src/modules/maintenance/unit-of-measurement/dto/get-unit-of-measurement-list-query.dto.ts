import { Transform } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { UnitOfMeasurementQuantityMode, UnitOfMeasurementStatus } from '@prisma/client';
import { toOptionalInt } from '../../../../common/utils/dto-transform.util';

export class GetUnitOfMeasurementListQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @IsOptional()
  @IsEnum(UnitOfMeasurementQuantityMode)
  quantityMode?: UnitOfMeasurementQuantityMode;

  @IsOptional()
  @IsEnum(UnitOfMeasurementStatus)
  status?: UnitOfMeasurementStatus;

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
  @IsIn(['name', 'symbol', 'quantityMode', 'status', 'createdAt', 'updatedAt'])
  sortBy?: 'name' | 'symbol' | 'quantityMode' | 'status' | 'createdAt' | 'updatedAt';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortDirection?: 'asc' | 'desc';
}
