import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProjectMaintenanceStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateProjectMaintenanceDto {
  @ApiProperty({ maxLength: 150 })
  @IsString()
  @MaxLength(150)
  projectName!: string;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  projectDescription?: string;

  @ApiPropertyOptional({ enum: ProjectMaintenanceStatus })
  @IsOptional()
  @IsEnum(ProjectMaintenanceStatus)
  status?: ProjectMaintenanceStatus;
}
