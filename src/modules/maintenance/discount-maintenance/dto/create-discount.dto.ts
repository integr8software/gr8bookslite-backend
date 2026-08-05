import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { DiscountStatus, DiscountType, DiscountValueType } from '@prisma/client';

export class CreateDiscountDto {
  @ApiProperty({ maxLength: 150 })
  @IsString()
  @MaxLength(150)
  name!: string;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ enum: DiscountType })
  @IsEnum(DiscountType)
  type!: DiscountType;

  @ApiProperty({ enum: DiscountValueType })
  @IsEnum(DiscountValueType)
  valueType!: DiscountValueType;

  @ApiProperty({ minimum: 0 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  value!: number;

  @ApiPropertyOptional({ enum: DiscountStatus })
  @IsOptional()
  @IsEnum(DiscountStatus)
  status?: DiscountStatus;
}
