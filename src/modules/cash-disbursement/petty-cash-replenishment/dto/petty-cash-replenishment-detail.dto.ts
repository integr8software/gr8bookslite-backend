import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class PettyCashReplenishmentDetailDto {
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

  @ApiPropertyOptional({ description: 'Petty Cash Date', example: '2026-05-21' })
  @IsOptional()
  @IsDateString()
  pettyCashDate?: string;

  @ApiPropertyOptional({ description: 'Petty Cash Date alias', example: '2026-05-21' })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({ description: 'Petty Cash Voucher Number', example: 'PCV-2026-000001' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  pettyCashNo?: string;

  @ApiPropertyOptional({ description: 'Petty Cash Number alias', example: 'PCV-2026-000001' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  voucherNo?: string;

  @ApiPropertyOptional({ description: 'Supplier / Party ID', example: '1' })
  @IsOptional()
  @IsString()
  partyId?: string;

  @ApiPropertyOptional({ description: 'Supplier Code Snapshot', example: 'SUP-001' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  supplierCodeSnapshot?: string;

  @ApiPropertyOptional({ description: 'Supplier Name Snapshot', example: 'Office Supplies Inc' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  supplierNameSnapshot?: string;

  @ApiPropertyOptional({ description: 'Supplier Code alias', example: 'SUP-001' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  supplierCode?: string;

  @ApiPropertyOptional({ description: 'Supplier Name alias', example: 'Office Supplies Inc' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  supplierName?: string;

  @ApiPropertyOptional({ description: 'Particulars', example: 'Stationery and supplies' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  particulars?: string;

  @ApiPropertyOptional({ description: 'Remarks', example: 'Replenishment claim' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  remarks?: string;

  @ApiPropertyOptional({ description: 'Amount', example: 2500.0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  amount?: number;

  @ApiPropertyOptional({ description: 'Net Amount', example: 2232.14 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  netAmount?: number;

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

  @ApiPropertyOptional({ description: 'VAT Amount', example: 267.86 })
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

  @ApiPropertyOptional({ description: 'EWT Amount', example: 44.64 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  ewtAmount?: number;

  @ApiPropertyOptional({ description: 'Disburse Amount', example: 2500.0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  disburseAmount?: number;

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
