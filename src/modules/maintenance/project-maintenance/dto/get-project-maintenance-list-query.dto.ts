import { Transform } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ProjectMaintenanceStatus } from '@prisma/client';
import { toOptionalInt } from '../../../../common/utils/dto-transform.util';

const ProjectMaintenanceSortFields = ['projectCode', 'projectName', 'status', 'createdAt', 'updatedAt'] as const;
const SortDirections = ['asc', 'desc'] as const;

export class GetProjectMaintenanceListQueryDto {
  @ApiPropertyOptional({ description: 'Search across project code, project name, or description', maxLength: 120, example: 'portal' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @ApiPropertyOptional({ description: 'Project status filter', enum: ProjectMaintenanceStatus, example: ProjectMaintenanceStatus.ACTIVE })
  @IsOptional()
  @IsEnum(ProjectMaintenanceStatus)
  status?: ProjectMaintenanceStatus;

  @ApiPropertyOptional({ description: 'Page number', minimum: 1, default: 1, example: 1 })
  @IsOptional()
  @Transform(({ value }) => toOptionalInt(value))
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', minimum: 1, maximum: 500, default: 50, example: 10 })
  @IsOptional()
  @Transform(({ value }) => toOptionalInt(value))
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number;

  @ApiPropertyOptional({ description: 'Field to sort by', enum: ProjectMaintenanceSortFields, default: 'projectName', example: 'projectName' })
  @IsOptional()
  @IsIn(ProjectMaintenanceSortFields)
  sortBy?: 'projectCode' | 'projectName' | 'status' | 'createdAt' | 'updatedAt';

  @ApiPropertyOptional({ description: 'Sort direction', enum: SortDirections, default: 'asc', example: 'asc' })
  @IsOptional()
  @IsIn(SortDirections)
  sortDirection?: 'asc' | 'desc';
}
