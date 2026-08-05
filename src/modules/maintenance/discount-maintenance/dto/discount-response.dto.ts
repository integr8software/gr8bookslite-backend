import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DiscountStatus, DiscountType, DiscountValueType } from '@prisma/client';

export class DiscountResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ nullable: true })
  description!: string | null;

  @ApiProperty({ enum: DiscountType })
  type!: DiscountType;

  @ApiProperty({ enum: DiscountValueType })
  valueType!: DiscountValueType;

  @ApiProperty()
  value!: string;

  @ApiProperty({ enum: DiscountStatus })
  status!: DiscountStatus;

  @ApiProperty()
  chartAccountId!: string;

  @ApiProperty()
  accountCode!: string;

  @ApiProperty()
  accountTitle!: string;

  @ApiProperty()
  accountGroupPath!: string;

  @ApiProperty({ nullable: true })
  createdBy!: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty({ nullable: true })
  updatedBy!: string | null;

  @ApiProperty()
  updatedAt!: Date;
}

export class DiscountOptionResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ enum: DiscountType })
  type!: DiscountType;

  @ApiProperty({ enum: DiscountValueType })
  valueType!: DiscountValueType;

  @ApiProperty()
  value!: string;

  @ApiProperty({ enum: DiscountStatus })
  status!: DiscountStatus;
}

export class DiscountMaintenanceStatisticsResponseDto {
  @ApiProperty()
  totalDiscounts!: number;

  @ApiProperty()
  activeDiscounts!: number;

  @ApiProperty()
  inactiveDiscounts!: number;

  @ApiProperty()
  purchaseDiscounts!: number;

  @ApiProperty()
  salesDiscounts!: number;

  @ApiProperty()
  percentageDiscounts!: number;
}

export class DiscountMaintenancePermissionsResponseDto {
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

export class DiscountMaintenancePaginationResponseDto {
  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  totalPages!: number;
}

export class DiscountListResponseDto {
  @ApiProperty({ type: [DiscountResponseDto] })
  discounts!: DiscountResponseDto[];

  @ApiProperty({ type: DiscountMaintenanceStatisticsResponseDto })
  statistics!: DiscountMaintenanceStatisticsResponseDto;

  @ApiProperty({ type: DiscountMaintenancePaginationResponseDto })
  pagination!: DiscountMaintenancePaginationResponseDto;

  @ApiProperty({ type: DiscountMaintenancePermissionsResponseDto })
  permissions!: DiscountMaintenancePermissionsResponseDto;
}

export class DiscountOptionsResponseDto {
  @ApiProperty({ type: [DiscountOptionResponseDto] })
  discounts!: DiscountOptionResponseDto[];
}

export class DiscountContainerResponseDto {
  @ApiProperty({ type: DiscountResponseDto })
  discount!: DiscountResponseDto;

  @ApiProperty({ type: DiscountMaintenancePermissionsResponseDto })
  permissions!: DiscountMaintenancePermissionsResponseDto;
}

export class SaveDiscountResponseDto {
  @ApiProperty()
  message!: string;

  @ApiProperty({ type: DiscountResponseDto })
  discount!: DiscountResponseDto;
}

export class ImportDiscountsResponseDto {
  @ApiProperty()
  message!: string;

  @ApiProperty({ type: [DiscountResponseDto] })
  discounts!: DiscountResponseDto[];
}
