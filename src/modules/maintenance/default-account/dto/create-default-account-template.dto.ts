import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import {
  ChartAccountStatus,
  DefaultAccountTemplateType,
} from '@prisma/client';

export class CreateDefaultAccountTemplateDto {
  @IsEnum(DefaultAccountTemplateType)
  type!: DefaultAccountTemplateType;

  @IsString()
  @MaxLength(250)
  description!: string;

  @IsOptional()
  @IsEnum(ChartAccountStatus)
  status?: ChartAccountStatus;
}
