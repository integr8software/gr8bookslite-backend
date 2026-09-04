import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength, ValidateIf } from 'class-validator';
import { ChartAccountStatus, ServiceAccountSetupMode, ServiceMaintenanceType } from '@prisma/client';

export class CreateServiceMaintenanceDto {
  @ApiProperty({ maxLength: 150 })
  @IsString()
  @MaxLength(150)
  serviceName!: string;

  @ApiProperty({ enum: ServiceMaintenanceType })
  @IsEnum(ServiceMaintenanceType)
  serviceType!: ServiceMaintenanceType;

  @ApiPropertyOptional({ maxLength: 500, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string | null;

  @ApiPropertyOptional({ enum: ChartAccountStatus })
  @IsOptional()
  @IsEnum(ChartAccountStatus)
  status?: ChartAccountStatus;

  @ApiProperty({ enum: ServiceAccountSetupMode })
  @IsEnum(ServiceAccountSetupMode)
  accountSetupMode!: ServiceAccountSetupMode;

  @ApiPropertyOptional({ nullable: true })
  @ValidateIf((dto: CreateServiceMaintenanceDto) => dto.accountSetupMode === ServiceAccountSetupMode.EXISTING)
  @IsString()
  revenueCoaId?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  expenseParentCoaId?: string | null;
}
