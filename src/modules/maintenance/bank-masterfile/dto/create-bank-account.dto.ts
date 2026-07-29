import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, Min } from 'class-validator';
import { ChartAccountStatus } from '@prisma/client';

export class CreateBankAccountDto {
  @IsString()
  @MaxLength(100)
  bankName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  branch?: string;

  @IsOptional()
  @ApiPropertyOptional()
  @IsString()
  @MaxLength(100)
  accountNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(250)
  accountName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  accountType?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  seriesStart!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  seriesEnd!: string;

  @Transform(({ value }) => toOptionalNumber(value))
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  seriesDigits!: number;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  currencyCode?: string;

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
