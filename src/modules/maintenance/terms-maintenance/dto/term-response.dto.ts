import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TermDateMode, TermStatus } from '@prisma/client';

export class TermResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ nullable: true })
  description!: string | null;

  @ApiProperty({ enum: TermDateMode })
  dateMode!: TermDateMode;

  @ApiProperty()
  period!: number;

  @ApiProperty({ enum: TermStatus })
  status!: TermStatus;

  @ApiProperty({ nullable: true })
  createdBy!: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty({ nullable: true })
  updatedBy!: string | null;

  @ApiProperty()
  updatedAt!: Date;
}

export class TermLookupOptionResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ enum: TermDateMode })
  dateMode!: TermDateMode;

  @ApiProperty()
  period!: number;

  @ApiProperty({ enum: TermStatus })
  status!: TermStatus;
}

export class TermsMaintenanceStatisticsResponseDto {
  @ApiProperty()
  totalTerms!: number;

  @ApiProperty()
  activeTerms!: number;

  @ApiProperty()
  inactiveTerms!: number;

  @ApiProperty()
  dayTerms!: number;

  @ApiProperty()
  monthTerms!: number;

  @ApiProperty()
  yearTerms!: number;
}

export class TermsMaintenancePermissionsResponseDto {
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

export class TermsMaintenancePaginationResponseDto {
  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  totalPages!: number;
}

export class TermListResponseDto {
  @ApiProperty({ type: [TermResponseDto] })
  terms!: TermResponseDto[];

  @ApiProperty({ type: TermsMaintenanceStatisticsResponseDto })
  statistics!: TermsMaintenanceStatisticsResponseDto;

  @ApiProperty({ type: TermsMaintenancePaginationResponseDto })
  pagination!: TermsMaintenancePaginationResponseDto;

  @ApiProperty({ type: TermsMaintenancePermissionsResponseDto })
  permissions!: TermsMaintenancePermissionsResponseDto;
}

export class TermLookupResponseDto {
  @ApiProperty({ type: [TermLookupOptionResponseDto] })
  terms!: TermLookupOptionResponseDto[];
}

export class TermContainerResponseDto {
  @ApiProperty({ type: TermResponseDto })
  term!: TermResponseDto;

  @ApiProperty({ type: TermsMaintenancePermissionsResponseDto })
  permissions!: TermsMaintenancePermissionsResponseDto;
}

export class SaveTermResponseDto {
  @ApiProperty()
  message!: string;

  @ApiProperty({ type: TermResponseDto })
  term!: TermResponseDto;
}

export class ImportTermsResponseDto {
  @ApiProperty()
  message!: string;

  @ApiProperty({ type: [TermResponseDto] })
  terms!: TermResponseDto[];
}
