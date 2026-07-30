import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { DiscountType, DiscountValueType } from '@prisma/client';

export class DiscountLookupQueryDto {
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
}
