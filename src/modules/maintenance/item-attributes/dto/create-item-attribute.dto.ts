import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, IsEnum, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
import { ItemAttributeStatus, ItemAttributeUsage } from '@prisma/client';
import { ItemAttributeValueDto } from './item-attribute-value.dto';

export class CreateItemAttributeDto {
  @IsString()
  @MaxLength(150)
  name!: string;

  @IsOptional()
  @IsEnum(ItemAttributeUsage)
  usage?: ItemAttributeUsage;

  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => ItemAttributeValueDto)
  values!: ItemAttributeValueDto[];

  @IsOptional()
  @IsBoolean()
  requiredOnItem?: boolean;

  @IsOptional()
  @IsBoolean()
  affectsStock?: boolean;

  @IsOptional()
  @IsEnum(ItemAttributeStatus)
  status?: ItemAttributeStatus;
}
