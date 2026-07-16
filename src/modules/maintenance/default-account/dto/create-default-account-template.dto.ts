import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ChartAccountStatus, DefaultAccountTemplateType } from '@prisma/client';

export class CreateDefaultAccountTemplateDto {
  @IsEnum(DefaultAccountTemplateType)
  type!: DefaultAccountTemplateType;

  @IsString()
  @MaxLength(250)
  defaultAccountName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsEnum(ChartAccountStatus)
  status?: ChartAccountStatus;

  @IsOptional()
  @IsString()
  expenseParentCoaId?: string;
}
