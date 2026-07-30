import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { UnitOfMeasurementQuantityMode } from '@prisma/client';

export class UnitOfMeasurementLookupQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @IsOptional()
  @IsEnum(UnitOfMeasurementQuantityMode)
  quantityMode?: UnitOfMeasurementQuantityMode;
}
