import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ChartAccountStatus, DefaultAccountTemplateType } from '@prisma/client';

export class CreateDefaultAccountTemplateDto {
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

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  expenseParentCoaId?: string;
}
