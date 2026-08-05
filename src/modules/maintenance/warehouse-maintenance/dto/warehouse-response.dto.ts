import { ApiProperty } from '@nestjs/swagger';
import { WarehouseBranchAvailabilityMode, WarehouseStatus } from '@prisma/client';

export class WarehouseBranchResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;
}

export class WarehouseResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ type: [String] })
  branchUnitIds!: string[];

  @ApiProperty({ enum: WarehouseBranchAvailabilityMode })
  branchAvailabilityMode!: WarehouseBranchAvailabilityMode;

  @ApiProperty({ type: [WarehouseBranchResponseDto] })
  branches!: WarehouseBranchResponseDto[];

  @ApiProperty({ nullable: true })
  managerName!: string | null;

  @ApiProperty({ enum: WarehouseStatus })
  status!: WarehouseStatus;

  @ApiProperty({ nullable: true })
  address!: string | null;

  @ApiProperty({ nullable: true })
  contactNo!: string | null;

  @ApiProperty({ nullable: true })
  description!: string | null;

  @ApiProperty({ nullable: true })
  createdBy!: string | null;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty({ nullable: true })
  updatedBy!: string | null;

  @ApiProperty({ nullable: true })
  updatedAt!: string | null;
}

export class WarehouseOptionResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ enum: WarehouseStatus })
  status!: WarehouseStatus;
}

export class WarehouseStatisticsResponseDto {
  @ApiProperty()
  totalWarehouses!: number;

  @ApiProperty()
  activeWarehouses!: number;

  @ApiProperty()
  inactiveWarehouses!: number;
}

export class WarehousePermissionsResponseDto {
  @ApiProperty()
  canView!: boolean;

  @ApiProperty()
  canCreate!: boolean;

  @ApiProperty()
  canUpdate!: boolean;

  @ApiProperty()
  canExport!: boolean;
}

export class WarehousePaginationResponseDto {
  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  totalPages!: number;
}

export class WarehouseListResponseDto {
  @ApiProperty({ type: [WarehouseResponseDto] })
  warehouses!: WarehouseResponseDto[];

  @ApiProperty({ type: WarehouseStatisticsResponseDto })
  statistics!: WarehouseStatisticsResponseDto;

  @ApiProperty({ type: WarehousePaginationResponseDto })
  pagination!: WarehousePaginationResponseDto;

  @ApiProperty({ type: WarehousePermissionsResponseDto })
  permissions!: WarehousePermissionsResponseDto;
}

export class WarehouseOptionsResponseDto {
  @ApiProperty({ type: [WarehouseOptionResponseDto] })
  warehouses!: WarehouseOptionResponseDto[];
}

export class WarehouseContainerResponseDto {
  @ApiProperty({ type: WarehouseResponseDto })
  warehouse!: WarehouseResponseDto;

  @ApiProperty({ type: WarehousePermissionsResponseDto })
  permissions!: WarehousePermissionsResponseDto;
}

export class SaveWarehouseResponseDto {
  @ApiProperty()
  message!: string;

  @ApiProperty({ type: WarehouseResponseDto })
  warehouse!: WarehouseResponseDto;
}
