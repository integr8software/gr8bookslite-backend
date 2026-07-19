import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { ItemAttributeValueStatus } from '@prisma/client';

export class ItemAttributeValueDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  @MaxLength(150)
  label!: string;

  @IsOptional()
  @IsBoolean()
  isUsed?: boolean;

  @IsInt()
  @Min(1)
  sortOrder!: number;

  @IsOptional()
  @IsEnum(ItemAttributeValueStatus)
  status?: ItemAttributeValueStatus;
}
