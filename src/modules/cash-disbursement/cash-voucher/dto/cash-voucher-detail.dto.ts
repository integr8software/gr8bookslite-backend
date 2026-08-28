import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CashVoucherDetailDto {
  @ApiPropertyOptional({ description: 'Line Detail ID', example: '1' })
  @IsString()
  @IsOptional()
  id?: string;

  @ApiProperty({ description: 'Line Number (1-indexed)', example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  lineNumber: number;

  @ApiPropertyOptional({ description: 'Account ID', example: '1' })
  @IsString()
  @IsOptional()
  accountId?: string;

  @ApiProperty({ description: 'Account Code', example: '6001010000' })
  @IsString()
  @IsNotEmpty()
  accountCode: string;

  @ApiProperty({ description: 'Account Title / Name', example: 'Office Supplies Expense' })
  @IsString()
  @IsNotEmpty()
  accountTitle: string;

  @ApiPropertyOptional({ description: 'Particulars', example: 'Office supplies for HQ' })
  @IsString()
  @IsOptional()
  particulars?: string;

  @ApiPropertyOptional({ description: 'Remarks', example: 'Monthly supplies replenishment' })
  @IsString()
  @IsOptional()
  remarks?: string;

  @ApiPropertyOptional({ description: 'Debit Amount', example: 5000.0 })
  @IsOptional()
  debit?: number | string;

  @ApiPropertyOptional({ description: 'Credit Amount', example: 0.0 })
  @IsOptional()
  credit?: number | string;

  @ApiPropertyOptional({ description: 'Gross Amount', example: 5000.0 })
  @IsOptional()
  grossAmount?: number | string;

  @ApiPropertyOptional({ description: 'Net Amount', example: 4464.29 })
  @IsOptional()
  netAmount?: number | string;

  @ApiPropertyOptional({ description: 'VAT Type / Label', example: 'VAT Inclusive' })
  @IsString()
  @IsOptional()
  vatType?: string;

  @ApiPropertyOptional({ description: 'VAT Code', example: 'VAT-IN' })
  @IsString()
  @IsOptional()
  vatCode?: string;

  @ApiPropertyOptional({ description: 'VAT Percent', example: 12.0 })
  @IsOptional()
  vatPercent?: number | string;

  @ApiPropertyOptional({ description: 'VAT Amount', example: 535.71 })
  @IsOptional()
  vatAmount?: number | string;

  @ApiPropertyOptional({ description: 'EWT Code', example: 'WI158' })
  @IsString()
  @IsOptional()
  ewtCode?: string;

  @ApiPropertyOptional({ description: 'EWT Percent', example: 1.0 })
  @IsOptional()
  ewtPercent?: number | string;

  @ApiPropertyOptional({ description: 'EWT Amount', example: 44.64 })
  @IsOptional()
  ewtAmount?: number | string;

  @ApiPropertyOptional({ description: 'Disburse Amount', example: 4955.36 })
  @IsOptional()
  disburseAmount?: number | string;

  @ApiPropertyOptional({ description: 'Party ID', example: '1' })
  @IsString()
  @IsOptional()
  partyId?: string;

  @ApiPropertyOptional({ description: 'Party Code', example: 'SUP-001' })
  @IsString()
  @IsOptional()
  partyCode?: string;

  @ApiPropertyOptional({ description: 'Party Name', example: 'National Bookstore' })
  @IsString()
  @IsOptional()
  partyName?: string;

  @ApiPropertyOptional({ description: 'Responsibility Center ID', example: '1' })
  @IsString()
  @IsOptional()
  responsibilityCenterId?: string;

  @ApiPropertyOptional({ description: 'Responsibility Center Name / Snapshot', example: 'Admin Dept' })
  @IsString()
  @IsOptional()
  responsibilityCenter?: string;

  @ApiPropertyOptional({ description: 'Reference ID / No', example: 'REF-001' })
  @IsString()
  @IsOptional()
  refId?: string;

  @ApiPropertyOptional({ description: 'Check Date (YYYY-MM-DD)', example: '2026-06-11' })
  @IsDateString()
  @IsOptional()
  checkDate?: string;

  @ApiPropertyOptional({ description: 'Check Number', example: 'CHK-123456' })
  @IsString()
  @IsOptional()
  checkNo?: string;

  @ApiPropertyOptional({ description: 'Check Status', example: 'Cleared' })
  @IsString()
  @IsOptional()
  checkStatus?: string;
}
