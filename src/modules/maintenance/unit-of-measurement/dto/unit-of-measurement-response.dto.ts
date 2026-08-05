import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UnitOfMeasurementQuantityMode, UnitOfMeasurementStatus } from '@prisma/client';

export class UnitOfMeasurementResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  symbol!: string;

  @ApiProperty({ enum: UnitOfMeasurementQuantityMode })
  quantityMode!: UnitOfMeasurementQuantityMode;

  @ApiProperty({ enum: UnitOfMeasurementStatus })
  status!: UnitOfMeasurementStatus;

  @ApiProperty({ nullable: true })
  createdBy!: string | null;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty({ nullable: true })
  updatedBy!: string | null;

  @ApiProperty({ nullable: true })
  updatedAt!: string | null;
}

export class UnitOfMeasurementOptionResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  symbol!: string;

  @ApiProperty({ enum: UnitOfMeasurementQuantityMode })
  quantityMode!: UnitOfMeasurementQuantityMode;

  @ApiProperty({ enum: UnitOfMeasurementStatus })
  status!: UnitOfMeasurementStatus;
}

export class UnitOfMeasurementStatisticsResponseDto {
  @ApiProperty()
  totalUnits!: number;

  @ApiProperty()
  activeUnits!: number;

  @ApiProperty()
  inactiveUnits!: number;

  @ApiProperty()
  decimalUnits!: number;
}

export class UnitOfMeasurementPermissionsResponseDto {
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

export class UnitOfMeasurementPaginationResponseDto {
  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  totalPages!: number;
}

export class UnitOfMeasurementListResponseDto {
  @ApiProperty({ type: [UnitOfMeasurementResponseDto] })
  units!: UnitOfMeasurementResponseDto[];

  @ApiProperty({ type: UnitOfMeasurementStatisticsResponseDto })
  statistics!: UnitOfMeasurementStatisticsResponseDto;

  @ApiProperty({ type: UnitOfMeasurementPaginationResponseDto })
  pagination!: UnitOfMeasurementPaginationResponseDto;

  @ApiProperty({ type: UnitOfMeasurementPermissionsResponseDto })
  permissions!: UnitOfMeasurementPermissionsResponseDto;
}

export class UnitOfMeasurementOptionsResponseDto {
  @ApiProperty({ type: [UnitOfMeasurementOptionResponseDto] })
  units!: UnitOfMeasurementOptionResponseDto[];
}

export class UnitOfMeasurementContainerResponseDto {
  @ApiProperty({ type: UnitOfMeasurementResponseDto })
  unit!: UnitOfMeasurementResponseDto;

  @ApiProperty({ type: UnitOfMeasurementPermissionsResponseDto })
  permissions!: UnitOfMeasurementPermissionsResponseDto;
}

export class SaveUnitOfMeasurementResponseDto {
  @ApiProperty()
  message!: string;

  @ApiProperty({ type: UnitOfMeasurementResponseDto })
  unit!: UnitOfMeasurementResponseDto;
}

export class ImportUnitOfMeasurementsResponseDto {
  @ApiProperty()
  message!: string;

  @ApiProperty({ type: [UnitOfMeasurementResponseDto] })
  units!: UnitOfMeasurementResponseDto[];
}
