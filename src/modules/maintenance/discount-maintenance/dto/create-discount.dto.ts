import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  DiscountStatus,
  DiscountType,
  DiscountValueType,
} from '@prisma/client';

export class CreateDiscountDto {
  @IsString()
  @MaxLength(150)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsEnum(DiscountType)
  type!: DiscountType;

  @IsEnum(DiscountValueType)
  valueType!: DiscountValueType;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  value!: number;

  @IsOptional()
  @IsEnum(DiscountStatus)
  status?: DiscountStatus;
}
