import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { ChartAccountStatus, ServiceAccountSetupMode, ServiceMaintenanceType } from '@prisma/client';
import { toOptionalInt } from '../../../../common/utils/dto-transform.util';

export class GetServiceMaintenanceListQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @IsOptional()
  @IsEnum(ChartAccountStatus)
  status?: ChartAccountStatus;

  @IsOptional()
  @IsEnum(ServiceAccountSetupMode)
  accountSetupMode?: ServiceAccountSetupMode;

  @ApiPropertyOptional({ enum: ServiceMaintenanceType, description: 'Filter by service type' })
  @IsOptional()
  @IsEnum(ServiceMaintenanceType)
  serviceType?: ServiceMaintenanceType;

  @IsOptional()
  @Transform(({ value }) => toOptionalInt(value))
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Transform(({ value }) => toOptionalInt(value))
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number;

  @ApiPropertyOptional({ enum: ['serviceName', 'serviceType', 'status', 'accountSetupMode', 'createdAt', 'updatedAt'], description: 'Sort by field', default: 'serviceName' })
  @IsOptional()
  @IsIn(['serviceName', 'serviceType', 'status', 'accountSetupMode', 'createdAt', 'updatedAt'])
  sortBy?: 'serviceName' | 'serviceType' | 'status' | 'accountSetupMode' | 'createdAt' | 'updatedAt';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortDirection?: 'asc' | 'desc';
}
