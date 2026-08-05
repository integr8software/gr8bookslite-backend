import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, Min } from 'class-validator';
import { ChartAccountStatus } from '@prisma/client';

export class CreateBankAccountDto {
  @ApiProperty({ maxLength: 100 })
  @IsString()
  @MaxLength(100)
  bankName!: string;

  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  branch?: string;

  @IsOptional()
  @ApiPropertyOptional({ maxLength: 100 })
  @IsString()
  @MaxLength(100)
  accountNumber?: string;

  @ApiPropertyOptional({ maxLength: 250 })
  @IsOptional()
  @IsString()
  @MaxLength(250)
  accountName?: string;

  @ApiPropertyOptional({ maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  accountType?: string;

  @ApiProperty({ maxLength: 50 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  seriesStart!: string;

  @ApiProperty({ maxLength: 50 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  seriesEnd!: string;

  @ApiProperty({ minimum: 1 })
  @Transform(({ value }) => toOptionalNumber(value))
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  seriesDigits!: number;

  @ApiPropertyOptional({ maxLength: 10 })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  currencyCode?: string;

  @ApiPropertyOptional({ pattern: '^\\d{10}$' })
  @IsOptional()
  @Matches(/^\d{10}$/)
  accountCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional({ enum: ChartAccountStatus })
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
