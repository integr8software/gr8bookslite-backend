import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ItemCategoryAccountingSetupMode, ItemCategoryStatus } from '@prisma/client';

export class ItemCategoryAccountingSetupResponseDto {
  @ApiProperty()
  inventoryAccount!: string;

  @ApiProperty()
  salesAccount!: string;

  @ApiProperty()
  costOfSalesAccount!: string;

  @ApiProperty()
  expenseAccount!: string;
}

export class ItemCategoryResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ nullable: true })
  description!: string | null;

  @ApiProperty({ nullable: true })
  parentId!: string | null;

  @ApiProperty({ enum: ItemCategoryAccountingSetupMode })
  accountingSetupMode!: ItemCategoryAccountingSetupMode;

  @ApiProperty({ type: ItemCategoryAccountingSetupResponseDto, nullable: true })
  accountingSetup!: Partial<ItemCategoryAccountingSetupResponseDto> | null;

  @ApiProperty({ type: ItemCategoryAccountingSetupResponseDto })
  effectiveAccountingSetup!: ItemCategoryAccountingSetupResponseDto;

  @ApiProperty()
  requiresInventoryAccount!: boolean;

  @ApiProperty()
  requiresSalesAccount!: boolean;

  @ApiProperty()
  requiresCostOfSalesAccount!: boolean;

  @ApiProperty()
  requiresExpenseAccount!: boolean;

  @ApiProperty({ type: [String] })
  behaviors!: string[];

  @ApiProperty({ nullable: true })
  inheritedAccountingSourceName!: string | null;

  @ApiProperty()
  allowSubCategory!: boolean;

  @ApiProperty({ enum: ItemCategoryStatus })
  status!: ItemCategoryStatus;

  @ApiProperty({ nullable: true })
  createdBy!: string | null;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty({ nullable: true })
  updatedBy!: string | null;

  @ApiProperty({ nullable: true })
  updatedAt!: string | null;

  @ApiProperty()
  usedByItemCount!: number;
}

export class ItemCategoryOptionResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ nullable: true })
  description!: string | null;

  @ApiProperty({ nullable: true })
  parentId!: string | null;

  @ApiProperty({ type: [String] })
  behaviors!: string[];

  @ApiProperty()
  allowSubCategory!: boolean;

  @ApiProperty({ enum: ItemCategoryStatus })
  status!: ItemCategoryStatus;
}

export class ItemCategoryStatisticsResponseDto {
  @ApiProperty()
  totalCount!: number;

  @ApiProperty()
  activeCount!: number;

  @ApiProperty()
  inactiveCount!: number;

  @ApiProperty()
  configuredCount!: number;

  @ApiProperty()
  inheritedCount!: number;

  @ApiProperty()
  subcategoryLockedCount!: number;
}

export class ItemCategoryPermissionsResponseDto {
  @ApiProperty()
  canView!: boolean;

  @ApiProperty()
  canCreate!: boolean;

  @ApiProperty()
  canUpdate!: boolean;

  @ApiProperty()
  canExport!: boolean;

  @ApiPropertyOptional()
  canImport?: boolean;
}

export class ItemCategoryListResponseDto {
  @ApiProperty({ type: [ItemCategoryResponseDto] })
  categories!: ItemCategoryResponseDto[];

  @ApiProperty({ type: ItemCategoryStatisticsResponseDto })
  statistics!: ItemCategoryStatisticsResponseDto;

  @ApiProperty({ type: ItemCategoryPermissionsResponseDto })
  permissions!: ItemCategoryPermissionsResponseDto;
}

export class ItemCategoryOptionsResponseDto {
  @ApiProperty({ type: [ItemCategoryOptionResponseDto] })
  categories!: ItemCategoryOptionResponseDto[];
}

export class SaveItemCategoryResponseDto {
  @ApiProperty()
  message!: string;

  @ApiProperty({ type: ItemCategoryResponseDto })
  category!: ItemCategoryResponseDto;
}
