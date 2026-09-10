import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { ChartAccountStatus, ServiceAccountSetupMode, ServiceMaintenanceType } from '@prisma/client';
import { toOptionalInt } from '../../../../common/utils/dto-transform.util';

export const ServiceMaintenanceSortFields = ['serviceName', 'serviceType', 'status', 'accountSetupMode', 'createdAt', 'updatedAt'] as const;

export type ServiceMaintenanceSortField = (typeof ServiceMaintenanceSortFields)[number];

export class GetServiceMaintenanceListQueryDto {
  @ApiPropertyOptional({ description: 'Search term for service name, description, or account' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @ApiPropertyOptional({ enum: ChartAccountStatus, description: 'Filter by status' })
  @IsOptional()
  @IsEnum(ChartAccountStatus)
  status?: ChartAccountStatus;

  @ApiPropertyOptional({ enum: ServiceAccountSetupMode, description: 'Filter by account setup mode' })
  @IsOptional()
  @IsEnum(ServiceAccountSetupMode)
  accountSetupMode?: ServiceAccountSetupMode;

  @ApiPropertyOptional({ enum: ServiceMaintenanceType, description: 'Filter by service type' })
  @IsOptional()
  @IsEnum(ServiceMaintenanceType)
  serviceType?: ServiceMaintenanceType;

  @ApiPropertyOptional({ description: 'Page number', default: 1, type: Number })
  @IsOptional()
  @Transform(({ value }) => toOptionalInt(value))
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Number of items per page', default: 20, type: Number })
  @IsOptional()
  @Transform(({ value }) => toOptionalInt(value))
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number;

  @ApiPropertyOptional({ enum: ServiceMaintenanceSortFields, description: 'Sort by field', default: 'serviceName' })
  @IsOptional()
  @IsIn(ServiceMaintenanceSortFields)
  sortBy?: ServiceMaintenanceSortField;

  @ApiPropertyOptional({ enum: ['asc', 'desc'], description: 'Sort direction', default: 'asc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortDirection?: 'asc' | 'desc';
}
