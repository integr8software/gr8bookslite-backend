import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CashVoucherDetailDto {
  @ApiPropertyOptional({ description: 'Line Detail ID', example: '1' })
  @IsString()
  @IsOptional()
  id?: string;

  @ApiProperty({ description: 'Line Number (1-indexed)', example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  lineNumber!: number;

  @ApiPropertyOptional({ description: 'Account ID', example: '1' })
  @IsString()
  @IsOptional()
  accountId?: string | null;

  @ApiProperty({ description: 'Account Code', example: '6001010000' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  accountCode!: string;

  @ApiProperty({ description: 'Account Title / Name', example: 'Office Supplies Expense' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  accountTitle!: string;

  @ApiPropertyOptional({ description: 'Particulars', example: 'Office supplies for HQ' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  particulars?: string | null;

  @ApiPropertyOptional({ description: 'Remarks', example: 'Monthly supplies replenishment' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  remarks?: string | null;

  @ApiPropertyOptional({ description: 'Debit Amount', example: 5000.0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  debit?: number;

  @ApiPropertyOptional({ description: 'Credit Amount', example: 0.0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  credit?: number;

  @ApiPropertyOptional({ description: 'Gross Amount', example: 5000.0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  grossAmount?: number;

  @ApiPropertyOptional({ description: 'Net Amount', example: 4464.29 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  netAmount?: number;

  @ApiPropertyOptional({ description: 'VAT Type / Label', example: 'VAT Inclusive' })
  @IsString()
  @IsOptional()
  @MaxLength(80)
  vatType?: string | null;

  @ApiPropertyOptional({ description: 'VAT Code', example: 'VAT-IN' })
  @IsString()
  @IsOptional()
  @MaxLength(80)
  vatCode?: string | null;

  @ApiPropertyOptional({ description: 'VAT Percent', example: 12.0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  vatPercent?: number;

  @ApiPropertyOptional({ description: 'VAT Amount', example: 535.71 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  vatAmount?: number;

  @ApiPropertyOptional({ description: 'EWT Code', example: 'WI158' })
  @IsString()
  @IsOptional()
  @MaxLength(80)
  ewtCode?: string | null;

  @ApiPropertyOptional({ description: 'EWT Percent', example: 1.0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  ewtPercent?: number;

  @ApiPropertyOptional({ description: 'EWT Amount', example: 44.64 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  ewtAmount?: number;

  @ApiPropertyOptional({ description: 'Disburse Amount', example: 4955.36 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  disburseAmount?: number;

  @ApiPropertyOptional({ description: 'Party ID', example: '1' })
  @IsString()
  @IsOptional()
  partyId?: string | null;

  @ApiPropertyOptional({ description: 'Party Code', example: 'SUP-001' })
  @IsString()
  @IsOptional()
  @MaxLength(80)
  partyCode?: string | null;

  @ApiPropertyOptional({ description: 'Party Name', example: 'National Bookstore' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  partyName?: string | null;

  @ApiPropertyOptional({ description: 'Responsibility Center ID', example: '1' })
  @IsString()
  @IsOptional()
  responsibilityCenterId?: string | null;

  @ApiPropertyOptional({ description: 'Responsibility Center Name / Snapshot', example: 'Admin Dept' })
  @IsString()
  @IsOptional()
  @MaxLength(150)
  responsibilityCenter?: string | null;

  @ApiPropertyOptional({ description: 'Reference ID / No', example: 'REF-001' })
  @IsString()
  @IsOptional()
  @MaxLength(120)
  refId?: string | null;

  @ApiPropertyOptional({ description: 'Check Date (YYYY-MM-DD)', example: '2026-06-11' })
  @IsDateString()
  @IsOptional()
  checkDate?: string | null;

  @ApiPropertyOptional({ description: 'Check Number', example: 'CHK-123456' })
  @IsString()
  @IsOptional()
  @MaxLength(80)
  checkNo?: string | null;

  @ApiPropertyOptional({ description: 'Check Status', example: 'Cleared' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  checkStatus?: string | null;
}
