import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { ChartAccountStatus } from '@prisma/client';

export class CreateBankAccountDto {
  @IsString()
  @MaxLength(100)
  bankName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  branch?: string;

  @IsString()
  @MaxLength(100)
  accountNumber!: string;

  @IsOptional()
  @IsString()
  @MaxLength(250)
  accountName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  accountType?: string;

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
  @Matches(/^\d{10}$/)
  accountCode?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsEnum(ChartAccountStatus)
  status?: ChartAccountStatus;
}

function toOptionalNumber(value: unknown) {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  return Number(value);
}
