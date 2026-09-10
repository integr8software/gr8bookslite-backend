import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { ProjectMaintenanceStatus, ProjectMaintenanceType } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { normalizeCode, trimString } from '../../../../common/utils/dto-transform.util';

export class CreateProjectMaintenanceDto {
  @ApiPropertyOptional({ maxLength: 80 })
  @IsOptional()
  @Transform(({ value }) => normalizeCode(value))
  @IsString()
  @MaxLength(80)
  projectCode?: string;

  @ApiProperty({ maxLength: 150 })
  @Transform(({ value }) => trimString(value))
  @IsString()
  @MaxLength(150)
  projectName!: string;

  @ApiProperty({ enum: ProjectMaintenanceType })
  @IsEnum(ProjectMaintenanceType)
  type!: ProjectMaintenanceType;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ enum: ProjectMaintenanceStatus })
  @IsOptional()
  @IsEnum(ProjectMaintenanceStatus)
  status?: ProjectMaintenanceStatus;
}
