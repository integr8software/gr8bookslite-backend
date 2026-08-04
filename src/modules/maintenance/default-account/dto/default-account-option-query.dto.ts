import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ChartAccountStatus } from '@prisma/client';

export class DefaultAccountOptionQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @IsOptional()
  @IsEnum(ChartAccountStatus)
  status?: ChartAccountStatus;
}
