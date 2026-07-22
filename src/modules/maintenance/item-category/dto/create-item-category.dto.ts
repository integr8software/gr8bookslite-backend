import { ArrayMinSize, IsArray, IsBoolean, IsEnum, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
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

  @IsOptional()
  @IsBoolean()
  requiresInventoryAccount?: boolean;

  @IsOptional()
  @IsBoolean()
  requiresSalesAccount?: boolean;

  @IsOptional()
  @IsBoolean()
  requiresCostOfSalesAccount?: boolean;

  @IsOptional()
  @IsBoolean()
  requiresExpenseAccount?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsIn(
    [
      'Sellable Item',
      'Purchasable Item',
      'Issuable Item',
      'Returnable Item',
      'Non-Inventory Item',
      'Raw Material',
      'Semi-Finished Goods/WIP',
      'Finished Goods',
      'Asset Item',
      'Consumable Item',
    ],
    {
      each: true,
    },
  )
  behaviors?: string[];

  @IsBoolean()
  allowSubCategory!: boolean;

  @IsOptional()
  @IsEnum(ItemCategoryStatus)
  status?: ItemCategoryStatus;
}
