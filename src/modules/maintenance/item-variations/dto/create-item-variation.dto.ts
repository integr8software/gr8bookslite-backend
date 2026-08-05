import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsEnum, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
import { ItemAttributeStatus as ItemVariationStatus, ItemAttributeUsage as ItemVariationUsage } from '@prisma/client';
import { ItemVariationValueDto } from './item-variation-value.dto';

export class CreateItemVariationDto {
  @IsString()
  @MaxLength(150)
  name!: string;

  @IsOptional()
  @IsEnum(ItemVariationUsage)
  usage?: ItemVariationUsage;

  @IsArray()
  @ArrayMinSize(1, { message: 'Enter at least one item variation value.' })
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => ItemVariationValueDto)
  values!: ItemVariationValueDto[];

  @IsOptional()
  @IsBoolean()
  requiredOnItem?: boolean;

  @IsOptional()
  @IsBoolean()
  affectsStock?: boolean;

  @IsOptional()
  @IsEnum(ItemVariationStatus)
  status?: ItemVariationStatus;
}
