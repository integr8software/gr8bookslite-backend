import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ChartAccountLevel, ChartAccountStatus } from '@prisma/client';
import { normalizeOptionalQueryString } from '../utils/chart-account-query.util';

export class GetChartAccountListQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @IsOptional()
  @IsEnum(ChartAccountLevel)
  accountLevel?: ChartAccountLevel;

  @IsOptional()
  @IsEnum(ChartAccountStatus)
  status?: ChartAccountStatus;

  @IsOptional()
  @Transform(({ value }) => normalizeOptionalQueryString(value))
  parentAccountId?: string;
}
