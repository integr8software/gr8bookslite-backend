import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ResponsibilityCenterCategory, ResponsibilityCenterFinancialType, ResponsibilityCenterStatus } from '@prisma/client';
import { emptyStringToUndefined, normalizeCode, trimString } from '../../../../common/utils/dto-transform.util';

export class CreateResponsibilityCenterDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => emptyStringToUndefined(value))
  @IsString()
  classificationId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => emptyStringToUndefined(value))
  @IsString()
  typeId?: string;

  @ApiPropertyOptional({ maxLength: 50 })
  @IsOptional()
  @Transform(({ value }) => normalizeCode(value))
  @IsString()
  @MaxLength(50)
  code?: string;

  @ApiProperty({ maxLength: 150 })
  @Transform(({ value }) => trimString(value))
  @IsString()
  @MaxLength(150)
  name!: string;

  @ApiPropertyOptional({ enum: ResponsibilityCenterCategory })
  @IsOptional()
  @IsEnum(ResponsibilityCenterCategory)
  category?: ResponsibilityCenterCategory;

  @ApiPropertyOptional({ enum: ResponsibilityCenterFinancialType })
  @IsOptional()
  @IsEnum(ResponsibilityCenterFinancialType)
  financialType?: ResponsibilityCenterFinancialType;

  @ApiPropertyOptional({ maxLength: 150 })
  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  @MaxLength(150)
  manager?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => emptyStringToUndefined(value))
  @IsString()
  parentId?: string;

  @ApiPropertyOptional({ enum: ResponsibilityCenterStatus })
  @IsOptional()
  @IsEnum(ResponsibilityCenterStatus)
  status?: ResponsibilityCenterStatus;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  @MaxLength(500)
  description?: string;
}
