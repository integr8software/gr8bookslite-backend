import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { UnitOfMeasurementQuantityMode, UnitOfMeasurementStatus } from '@prisma/client';

export class CreateUnitOfMeasurementDto {
  @IsString()
  @MaxLength(150)
  name!: string;

  @IsString()
  @MaxLength(30)
  symbol!: string;

  @IsEnum(UnitOfMeasurementQuantityMode)
  quantityMode!: UnitOfMeasurementQuantityMode;

  @IsOptional()
  @IsEnum(UnitOfMeasurementStatus)
  status?: UnitOfMeasurementStatus;
}
