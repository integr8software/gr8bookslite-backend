import { IsBoolean, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ItemCategoryAccountingSetupMode, ItemCategoryStatus } from '@prisma/client';

export class CreateItemCategoryDto {
  @IsString()
  @MaxLength(150)
  name!: string;

  @IsOptional()
  @IsString()
  parentId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string | null;

  @IsEnum(ItemCategoryAccountingSetupMode)
  accountingSetupMode!: ItemCategoryAccountingSetupMode;

  @IsBoolean()
  allowSubCategory!: boolean;

  @IsOptional()
  @IsEnum(ItemCategoryStatus)
  status?: ItemCategoryStatus;
}
