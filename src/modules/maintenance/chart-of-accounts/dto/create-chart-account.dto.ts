import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsNumber, IsObject, IsOptional, IsString, MaxLength, Min, ValidateNested } from 'class-validator';
import { AccountNature, BankAccountType, ChartAccountLevel, ChartAccountStatus, ChartAccountType } from '@prisma/client';
import { Type } from 'class-transformer';
import { normalizeOptionalQueryString } from '../../../../common/utils/dto-transform.util';

enum LinkedChartAccountDetailsKind {
  BANK = 'BANK',
}

class ChartAccountBankDetailsDto {
  @ApiPropertyOptional({ enum: LinkedChartAccountDetailsKind })
  @IsOptional()
  @IsEnum(LinkedChartAccountDetailsKind)
  kind?: LinkedChartAccountDetailsKind;

  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  bankName?: string;

  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  branch?: string;

  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  accountNumber?: string;

  @ApiPropertyOptional({ enum: BankAccountType })
  @IsOptional()
  @IsEnum(BankAccountType)
  accountType?: BankAccountType;

  @ApiPropertyOptional({ maxLength: 10 })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  currencyCode?: string;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsNumber()
  @Min(0)
  currencyExchangeRate?: number;

  @ApiPropertyOptional({ maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  seriesStart?: string;

  @ApiPropertyOptional({ maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  seriesEnd?: string;

  @ApiPropertyOptional({ minimum: 1 })
  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsInt()
  @Min(1)
  seriesDigits?: number;
}

export class CreateChartAccountDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => normalizeOptionalQueryString(value))
  parentAccountId?: string;

  @ApiProperty({ enum: ChartAccountLevel })
  @IsEnum(ChartAccountLevel)
  accountLevel!: ChartAccountLevel;

  @ApiProperty({ maxLength: 250 })
  @IsString()
  @MaxLength(250)
  accountTitle!: string;

  @ApiPropertyOptional({ enum: ChartAccountType })
  @IsOptional()
  @IsEnum(ChartAccountType)
  accountType?: ChartAccountType;

  @ApiPropertyOptional({ enum: AccountNature })
  @IsOptional()
  @IsEnum(AccountNature)
  accountNature?: AccountNature;

  @ApiPropertyOptional({ oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }] })
  @IsOptional()
  @Transform(({ value }) => normalizeAccountGroupInput(value))
  accountGroup?: string | string[];

  @ApiPropertyOptional({ maxLength: 250 })
  @IsOptional()
  @IsString()
  @MaxLength(250)
  statementSection?: string;

  @ApiPropertyOptional({ maxLength: 250 })
  @IsOptional()
  @IsString()
  @MaxLength(250)
  reportAlias?: string;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPostingAccount?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  withSubsidiary?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  contraAccount?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showTotal?: boolean;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  orderNo?: number;

  @ApiPropertyOptional({ maxLength: 10 })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  currencyCode?: string;

  @ApiPropertyOptional({ enum: ChartAccountStatus })
  @IsOptional()
  @IsEnum(ChartAccountStatus)
  status?: ChartAccountStatus;

  @ApiPropertyOptional({ type: ChartAccountBankDetailsDto })
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
