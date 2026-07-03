import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import {
  AccountNature,
  ChartAccountLevel,
  ChartAccountType,
} from '@prisma/client';
import { normalizeOptionalQueryString } from '../utils/chart-account-query.util';

export class CreateChartAccountDto {
  @IsOptional()
  @Transform(({ value }) => normalizeOptionalQueryString(value))
  parentAccountId?: string;

  @IsEnum(ChartAccountLevel)
  accountLevel!: ChartAccountLevel;

  @IsString()
  @MaxLength(250)
  accountTitle!: string;

  @IsOptional()
  @IsEnum(ChartAccountType)
  accountType?: ChartAccountType;

  @IsOptional()
  @IsEnum(AccountNature)
  accountNature?: AccountNature;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  accountGroup?: string;

  @IsOptional()
  @IsString()
  @MaxLength(250)
  statementSection?: string;

  @IsOptional()
  @IsString()
  @MaxLength(250)
  reportAlias?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsBoolean()
  isPostingAccount?: boolean;

  @IsOptional()
  @IsBoolean()
  withSubsidiary?: boolean;

  @IsOptional()
  @IsBoolean()
  contraAccount?: boolean;

  @IsOptional()
  @IsBoolean()
  showTotal?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  orderNo?: number;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  currencyCode?: string;
}
