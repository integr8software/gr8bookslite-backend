import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength, ValidateIf } from 'class-validator';
import { ChartAccountStatus, DefaultAccountTemplateType, ServiceAccountSetupMode } from '@prisma/client';

export class CreateCollectionTypeTemplateDto {
  @ApiProperty({ enum: DefaultAccountTemplateType })
  @IsEnum(DefaultAccountTemplateType)
  type!: DefaultAccountTemplateType;

  @ApiProperty({ maxLength: 250 })
  @IsString()
  @MaxLength(250)
  defaultAccountName!: string;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ enum: ChartAccountStatus })
  @IsOptional()
  @IsEnum(ChartAccountStatus)
  status?: ChartAccountStatus;

  @ApiProperty({ enum: ServiceAccountSetupMode })
  @IsEnum(ServiceAccountSetupMode)
  accountSetupMode!: ServiceAccountSetupMode;

  @ApiPropertyOptional({ nullable: true })
  @ValidateIf((dto: CreateCollectionTypeTemplateDto) => dto.accountSetupMode === ServiceAccountSetupMode.EXISTING)
  @IsString()
  revenueCoaId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  expenseParentCoaId?: string;
}
