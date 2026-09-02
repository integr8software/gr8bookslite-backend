import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class PettyCashFundDetailDto {
  @ApiPropertyOptional({ description: 'Line ID', example: '1' })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiPropertyOptional({ description: 'Line Number', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  lineNumber?: number;

  @ApiPropertyOptional({ description: 'Receipt/Disbursement Date', example: '2026-05-21' })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({ description: 'Receipt/Disbursement Date alias', example: '2026-05-21' })
  @IsOptional()
  @IsDateString()
  itemDate?: string;

  @ApiPropertyOptional({ description: 'Supplier / Party ID', example: '1' })
  @IsOptional()
  @IsString()
  partyId?: string;

  @ApiPropertyOptional({ description: 'Supplier Code Snapshot', example: 'SUP-001' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  supplierCodeSnapshot?: string;

  @ApiPropertyOptional({ description: 'Supplier Name Snapshot', example: 'Office Depot' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  supplierNameSnapshot?: string;

  @ApiPropertyOptional({ description: 'Supplier Code alias', example: 'SUP-001' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  supplierCode?: string;

  @ApiPropertyOptional({ description: 'Supplier Name alias', example: 'Office Depot' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  supplierName?: string;

  @ApiPropertyOptional({ description: 'Official Receipt Number', example: 'OR-99823' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  orNo?: string;

  @ApiPropertyOptional({ description: 'TIN Number', example: '123-456-789-000' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  tinNo?: string;

  @ApiPropertyOptional({ description: 'Particulars', example: 'Office supplies replenishment' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  particulars?: string;

  @ApiPropertyOptional({ description: 'Remarks', example: 'Approved for urgent buy' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  remarks?: string;

  @ApiPropertyOptional({ description: 'Amount / Gross Amount', example: 1200.0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  amount?: number;

  @ApiPropertyOptional({ description: 'Gross Amount', example: 1200.0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  grossAmount?: number;

  @ApiPropertyOptional({ description: 'Net Amount', example: 1071.43 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  netAmount?: number;

  @ApiPropertyOptional({ description: 'Disburse Amount', example: 1200.0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  disburseAmount?: number;

  @ApiPropertyOptional({ description: 'VAT Type', example: 'VAT Inclusive' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  vatType?: string;

  @ApiPropertyOptional({ description: 'VAT Percent', example: 12.0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  vatPercent?: number;

  @ApiPropertyOptional({ description: 'VAT Amount', example: 128.57 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  vatAmount?: number;

  @ApiPropertyOptional({ description: 'EWT Code', example: 'WC100' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  ewtCode?: string;

  @ApiPropertyOptional({ description: 'EWT Percent', example: 2.0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  ewtPercent?: number;

  @ApiPropertyOptional({ description: 'EWT Amount', example: 21.43 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  ewtAmount?: number;

  @ApiPropertyOptional({ description: 'Expense Type', example: 'Office Supplies' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  expenseType?: string;

  @ApiPropertyOptional({ description: 'Responsibility Center ID', example: '1' })
  @IsOptional()
  @IsString()
  responsibilityCenterId?: string;

  @ApiPropertyOptional({ description: 'Responsibility Center Code', example: 'RC-001' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  responsibilityCenterCodeSnapshot?: string;

  @ApiPropertyOptional({ description: 'Responsibility Center Name', example: 'Operations' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  responsibilityCenterSnapshot?: string;

  @ApiPropertyOptional({ description: 'Responsibility Center Code alias', example: 'RC-001' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  responsibilityCenterCode?: string;

  @ApiPropertyOptional({ description: 'Responsibility Center Name alias', example: 'Operations' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  responsibilityCenter?: string;
}
