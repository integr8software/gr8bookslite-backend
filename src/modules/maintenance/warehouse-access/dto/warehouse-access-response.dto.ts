import { ApiProperty } from '@nestjs/swagger';
import { UserStatus, WarehouseAccessLevel, WarehouseAccessPermission, WarehouseAccessStatus } from '@prisma/client';

export class WarehouseAccessResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  warehouseId!: string;

  @ApiProperty()
  warehouseCode!: string;

  @ApiProperty()
  warehouseName!: string;

  @ApiProperty()
  userId!: number;

  @ApiProperty()
  userName!: string;

  @ApiProperty()
  userEmail!: string;

  @ApiProperty({ enum: WarehouseAccessLevel })
  accessLevel!: WarehouseAccessLevel;

  @ApiProperty({ enum: WarehouseAccessPermission, isArray: true })
  permissions!: WarehouseAccessPermission[];

  @ApiProperty({ enum: WarehouseAccessStatus })
  status!: WarehouseAccessStatus;

  @ApiProperty({ nullable: true })
  createdBy!: string | null;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty({ nullable: true })
  updatedBy!: string | null;

  @ApiProperty({ nullable: true })
  updatedAt!: string | null;
}

export class WarehouseAccessStatisticsResponseDto {
  @ApiProperty()
  totalAssignments!: number;

  @ApiProperty()
  activeAssignments!: number;

  @ApiProperty()
  inactiveAssignments!: number;

  @ApiProperty()
  managerAssignments!: number;

  @ApiProperty()
  pickerAssignments!: number;

  @ApiProperty()
  viewerAssignments!: number;
}

export class WarehouseAccessPermissionsResponseDto {
  @ApiProperty()
  canView!: boolean;

  @ApiProperty()
  canCreate!: boolean;

  @ApiProperty()
  canUpdate!: boolean;

  @ApiProperty()
  canDelete!: boolean;

  @ApiProperty()
  canExport!: boolean;
}

export class WarehouseAccessPaginationResponseDto {
  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  totalPages!: number;
}

export class WarehouseAccessListResponseDto {
  @ApiProperty({ type: [WarehouseAccessResponseDto] })
  warehouseAccess!: WarehouseAccessResponseDto[];

  @ApiProperty({ type: WarehouseAccessStatisticsResponseDto })
  statistics!: WarehouseAccessStatisticsResponseDto;

  @ApiProperty({ type: WarehouseAccessPaginationResponseDto })
  pagination!: WarehouseAccessPaginationResponseDto;

  @ApiProperty({ type: WarehouseAccessPermissionsResponseDto })
  permissions!: WarehouseAccessPermissionsResponseDto;
}

export class WarehouseAccessContainerResponseDto {
  @ApiProperty({ type: WarehouseAccessResponseDto })
  warehouseAccess!: WarehouseAccessResponseDto;

  @ApiProperty({ type: WarehouseAccessPermissionsResponseDto })
  permissions!: WarehouseAccessPermissionsResponseDto;
}

export class SaveWarehouseAccessResponseDto {
  @ApiProperty()
  message!: string;

  @ApiProperty({ type: WarehouseAccessResponseDto })
  warehouseAccess!: WarehouseAccessResponseDto;
}

export class CreateWarehouseAccessResponseDto {
  @ApiProperty()
  message!: string;

  @ApiProperty({ type: [WarehouseAccessResponseDto] })
  warehouseAccess!: WarehouseAccessResponseDto[];
}

export class WarehouseAccessDirectoryUserResponseDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty({ nullable: true })
  contactNumber!: string | null;

  @ApiProperty({ enum: UserStatus })
  status!: UserStatus;

  @ApiProperty({ type: [Number] })
  branchUnitIds!: number[];

  @ApiProperty({ type: [String] })
  branchNames!: string[];

  @ApiProperty({ nullable: true })
  companyRoleId!: number | null;

  @ApiProperty({ nullable: true })
  companyRoleName!: string | null;
}

export class WarehouseAccessDirectoryBranchResponseDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  name!: string;
}

export class WarehouseAccessDirectoryResponseDto {
  @ApiProperty({ type: [WarehouseAccessDirectoryUserResponseDto] })
  users!: WarehouseAccessDirectoryUserResponseDto[];

  @ApiProperty({ type: [WarehouseAccessDirectoryBranchResponseDto] })
  branches!: WarehouseAccessDirectoryBranchResponseDto[];
}
