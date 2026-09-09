import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProjectMaintenanceStatus } from '@prisma/client';

export class ProjectMaintenanceResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  projectName!: string;

  @ApiProperty({ nullable: true })
  projectDescription!: string | null;

  @ApiProperty({ enum: ProjectMaintenanceStatus })
  status!: ProjectMaintenanceStatus;

  @ApiProperty({ nullable: true })
  createdBy!: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty({ nullable: true })
  updatedBy!: string | null;

  @ApiProperty()
  updatedAt!: Date;
}

export class ProjectMaintenanceStatisticsResponseDto {
  @ApiProperty()
  totalProjects!: number;

  @ApiProperty()
  activeProjects!: number;

  @ApiProperty()
  inactiveProjects!: number;
}

export class ProjectMaintenancePermissionsResponseDto {
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

export class ProjectMaintenancePaginationResponseDto {
  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  totalPages!: number;
}

export class ProjectMaintenanceListResponseDto {
  @ApiProperty({ type: [ProjectMaintenanceResponseDto] })
  projects!: ProjectMaintenanceResponseDto[];

  @ApiProperty({ type: ProjectMaintenanceStatisticsResponseDto })
  statistics!: ProjectMaintenanceStatisticsResponseDto;

  @ApiProperty({ type: ProjectMaintenancePaginationResponseDto })
  pagination!: ProjectMaintenancePaginationResponseDto;

  @ApiProperty({ type: ProjectMaintenancePermissionsResponseDto })
  permissions!: ProjectMaintenancePermissionsResponseDto;
}

export class ProjectMaintenanceContainerResponseDto {
  @ApiProperty({ type: ProjectMaintenanceResponseDto })
  project!: ProjectMaintenanceResponseDto;

  @ApiProperty({ type: ProjectMaintenancePermissionsResponseDto })
  permissions!: ProjectMaintenancePermissionsResponseDto;
}

export class SaveProjectMaintenanceResponseDto {
  @ApiProperty()
  message!: string;

  @ApiProperty({ type: ProjectMaintenanceResponseDto })
  project!: ProjectMaintenanceResponseDto;
}
