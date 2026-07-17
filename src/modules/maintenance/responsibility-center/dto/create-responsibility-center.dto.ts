import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import {
  ResponsibilityCenterCategory,
  ResponsibilityCenterFinancialType,
  ResponsibilityCenterStatus,
} from '@prisma/client';
import {
  emptyStringToUndefined,
  normalizeCode,
  trimString,
} from '../../../../common/utils/dto-transform.util';

export class CreateResponsibilityCenterDto {
  @IsOptional()
  @Transform(({ value }) => emptyStringToUndefined(value))
  @IsString()
  classificationId?: string;

  @IsOptional()
  @Transform(({ value }) => emptyStringToUndefined(value))
  @IsString()
  typeId?: string;

  @IsOptional()
  @Transform(({ value }) => normalizeCode(value))
  @IsString()
  @MaxLength(50)
  code?: string;

  @Transform(({ value }) => trimString(value))
  @IsString()
  @MaxLength(150)
  name!: string;

  @IsOptional()
  @IsEnum(ResponsibilityCenterCategory)
  category?: ResponsibilityCenterCategory;

  @IsOptional()
  @IsEnum(ResponsibilityCenterFinancialType)
  financialType?: ResponsibilityCenterFinancialType;

  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  @MaxLength(150)
  manager?: string;

  @IsOptional()
  @Transform(({ value }) => emptyStringToUndefined(value))
  @IsString()
  parentId?: string;

  @IsOptional()
  @IsEnum(ResponsibilityCenterStatus)
  status?: ResponsibilityCenterStatus;

  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  @MaxLength(500)
  description?: string;
}
