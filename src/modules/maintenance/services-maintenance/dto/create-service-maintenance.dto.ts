import { IsEnum, IsOptional, IsString, MaxLength, ValidateIf } from 'class-validator';
import { ChartAccountStatus, ServiceAccountSetupMode } from '@prisma/client';

export class CreateServiceMaintenanceDto {
  @IsString()
  @MaxLength(150)
  serviceName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string | null;

  @IsOptional()
  @IsEnum(ChartAccountStatus)
  status?: ChartAccountStatus;

  @IsEnum(ServiceAccountSetupMode)
  accountSetupMode!: ServiceAccountSetupMode;

  @ValidateIf((dto: CreateServiceMaintenanceDto) => dto.accountSetupMode === ServiceAccountSetupMode.EXISTING)
  @IsString()
  revenueCoaId?: string | null;
}
