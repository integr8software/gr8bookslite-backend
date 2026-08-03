import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ChartAccountLevel, ChartAccountStatus, ServiceAccountSetupMode } from '@prisma/client';

export class ServiceMaintenanceResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  serviceName!: string;

  @ApiProperty({ nullable: true })
  description!: string | null;

  @ApiProperty({ enum: ChartAccountStatus })
  status!: ChartAccountStatus;

  @ApiProperty({ enum: ServiceAccountSetupMode })
  accountSetupMode!: ServiceAccountSetupMode;

  @ApiProperty()
  revenueCoaId!: string;

  @ApiProperty()
  revenueAccountCode!: string;

  @ApiProperty()
  revenueAccountTitle!: string;

  @ApiProperty()
  isGeneratedRevenueAccount!: boolean;

  @ApiProperty({ nullable: true })
  createdBy!: string | null;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty({ nullable: true })
  updatedBy!: string | null;

  @ApiProperty({ nullable: true })
  updatedAt!: string | null;
}

export class ServiceMaintenanceOptionResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  serviceName!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ enum: ChartAccountStatus })
  status!: ChartAccountStatus;
}

export class ServiceMaintenanceStatisticsResponseDto {
  @ApiProperty()
  totalServices!: number;

  @ApiProperty()
  activeServices!: number;

  @ApiProperty()
  inactiveServices!: number;

  @ApiProperty()
  accountTitles!: number;
}

export class ServiceMaintenancePermissionsResponseDto {
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

export class ServiceMaintenancePaginationResponseDto {
  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  totalPages!: number;
}

export class ServiceMaintenanceListResponseDto {
  @ApiProperty({ type: [ServiceMaintenanceResponseDto] })
  services!: ServiceMaintenanceResponseDto[];

  @ApiProperty({ type: ServiceMaintenanceStatisticsResponseDto })
  statistics!: ServiceMaintenanceStatisticsResponseDto;

  @ApiProperty({ type: ServiceMaintenancePaginationResponseDto })
  pagination!: ServiceMaintenancePaginationResponseDto;

  @ApiProperty({ type: ServiceMaintenancePermissionsResponseDto })
  permissions!: ServiceMaintenancePermissionsResponseDto;
}

export class ServiceMaintenanceOptionsResponseDto {
  @ApiProperty({ type: [ServiceMaintenanceOptionResponseDto] })
  services!: ServiceMaintenanceOptionResponseDto[];
}

export class ServiceMaintenanceContainerResponseDto {
  @ApiProperty({ type: ServiceMaintenanceResponseDto })
  service!: ServiceMaintenanceResponseDto;

  @ApiProperty({ type: ServiceMaintenancePermissionsResponseDto })
  permissions!: ServiceMaintenancePermissionsResponseDto;
}

export class ServiceMaintenanceAccountOptionResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  accountNumber!: string;

  @ApiProperty()
  accountName!: string;

  @ApiPropertyOptional({ nullable: true })
  description?: string | null;

  @ApiPropertyOptional({ nullable: true })
  accountType?: string | null;

  @ApiPropertyOptional({ nullable: true })
  accountCategory?: string | null;

  @ApiPropertyOptional({ nullable: true })
  statementGroup?: string | null;

  @ApiPropertyOptional({ nullable: true })
  statementSection?: string | null;

  @ApiPropertyOptional({ nullable: true })
  normalBalance?: 'Debit' | 'Credit' | null;

  @ApiPropertyOptional()
  status?: 'Active' | 'Inactive';
}

export class ServiceMaintenanceAccountOptionsResponseDto {
  @ApiProperty({ type: [ServiceMaintenanceAccountOptionResponseDto] })
  accounts!: ServiceMaintenanceAccountOptionResponseDto[];
}

export class ServiceMaintenanceNextAccountCodeResponseDto {
  @ApiProperty()
  accountCode!: string;

  @ApiProperty()
  parentAccountId!: string;

  @ApiProperty()
  parentAccountCode!: string;

  @ApiProperty({ enum: ChartAccountLevel })
  parentAccountLevel!: ChartAccountLevel;

  @ApiProperty()
  parentAccountTitle!: string;
}

export class SaveServiceMaintenanceResponseDto {
  @ApiProperty()
  message!: string;

  @ApiProperty({ type: ServiceMaintenanceResponseDto })
  service!: ServiceMaintenanceResponseDto;
}
