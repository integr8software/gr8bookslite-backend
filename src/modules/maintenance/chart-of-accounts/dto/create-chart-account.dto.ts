import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsNumber, IsObject, IsOptional, IsString, MaxLength, Min, ValidateNested } from 'class-validator';
import { AccountNature, ChartAccountLevel, ChartAccountStatus, ChartAccountType } from '@prisma/client';
import { Type } from 'class-transformer';
import { normalizeOptionalQueryString } from '../../../../common/utils/dto-transform.util';

enum LinkedChartAccountDetailsKind {
  BANK = 'BANK',
}

class ChartAccountBankDetailsDto {
  @IsOptional()
  @IsEnum(LinkedChartAccountDetailsKind)
  kind?: LinkedChartAccountDetailsKind;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  bankName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  branch?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  accountNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  accountType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  currencyCode?: string;

  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsNumber()
  @Min(0)
  currencyExchangeRate?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  seriesStart?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  seriesEnd?: string;

  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsInt()
  @Min(1)
  seriesDigits?: number;
}

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
  @Transform(({ value }) => normalizeAccountGroupInput(value))
  accountGroup?: string | string[];

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

  @IsOptional()
  @IsEnum(ChartAccountStatus)
  status?: ChartAccountStatus;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => ChartAccountBankDetailsDto)
  linkedDetails?: ChartAccountBankDetailsDto;
}

function toOptionalNumber(value: unknown) {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  return Number(value);
}

function normalizeAccountGroupInput(value: unknown) {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => (typeof item === 'string' ? [item.trim()] : [])).filter(Boolean);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed ? trimmed : undefined;
  }

  return undefined;
}
