import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { AccountNature, ChartAccountLevel, ChartAccountStatus, ChartAccountType } from '@prisma/client';
import { normalizeOptionalQueryString } from '../../../../common/utils/dto-transform.util';

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
  @IsEnum(ChartAccountType)
  accountType?: ChartAccountType;

  @IsOptional()
  @IsEnum(AccountNature)
  accountNature?: AccountNature;

  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : value === true || value === 'true'))
  @IsBoolean()
  postingOnly?: boolean;

  @IsOptional()
  @Transform(({ value }) => normalizeOptionalQueryString(value))
  parentAccountId?: string;
}
