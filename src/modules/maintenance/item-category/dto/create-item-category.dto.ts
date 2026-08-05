import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsBoolean, IsEnum, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { ItemCategoryAccountingSetupMode, ItemCategoryStatus } from '@prisma/client';

export const ItemCategoryBehaviorValues = [
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
] as const;

export class CreateItemCategoryDto {
  @ApiProperty({ maxLength: 150 })
  @IsString()
  @MaxLength(150)
  name!: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  parentId?: string | null;

  @ApiPropertyOptional({ maxLength: 500, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string | null;

  @ApiProperty({ enum: ItemCategoryAccountingSetupMode })
  @IsEnum(ItemCategoryAccountingSetupMode)
  accountingSetupMode!: ItemCategoryAccountingSetupMode;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  requiresInventoryAccount?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  requiresSalesAccount?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  requiresCostOfSalesAccount?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  requiresExpenseAccount?: boolean;

  @ApiPropertyOptional({ enum: ItemCategoryBehaviorValues, isArray: true, minItems: 1 })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsIn(ItemCategoryBehaviorValues, { each: true })
  behaviors?: string[];

  @ApiProperty()
  @IsBoolean()
  allowSubCategory!: boolean;

  @ApiPropertyOptional({ enum: ItemCategoryStatus })
  @IsOptional()
  @IsEnum(ItemCategoryStatus)
  status?: ItemCategoryStatus;
}
