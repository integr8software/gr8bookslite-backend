import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { UnitOfMeasurementQuantityMode, UnitOfMeasurementStatus } from '@prisma/client';

export class CreateUnitOfMeasurementDto {
  @ApiProperty({ maxLength: 150 })
  @IsString()
  @MaxLength(150)
  name!: string;

  @ApiProperty({ maxLength: 30 })
  @IsString()
  @MaxLength(30)
  symbol!: string;

  @ApiProperty({ enum: UnitOfMeasurementQuantityMode })
  @IsEnum(UnitOfMeasurementQuantityMode)
  quantityMode!: UnitOfMeasurementQuantityMode;

  @ApiPropertyOptional({ enum: UnitOfMeasurementStatus })
  @IsOptional()
  @IsEnum(UnitOfMeasurementStatus)
  status?: UnitOfMeasurementStatus;
}
