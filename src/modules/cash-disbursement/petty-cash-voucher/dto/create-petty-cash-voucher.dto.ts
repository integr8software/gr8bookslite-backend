import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { PettyCashVoucherStatus } from '@prisma/client';

export class CreatePettyCashVoucherDto {
  @ApiPropertyOptional({ description: 'Branch Unit ID', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  branchUnitId?: number;

  @ApiPropertyOptional({ description: 'Party ID', example: '1' })
  @IsOptional()
  @IsString()
  partyId?: string;

  @ApiPropertyOptional({ description: 'Party Code', example: 'PTY-001' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  partyCode?: string;

  @ApiPropertyOptional({ description: 'Party Name', example: 'Acme Corp' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  partyName?: string;

  @ApiPropertyOptional({ description: 'Responsibility Center ID', example: '1' })
  @IsOptional()
  @IsString()
  responsibilityCenterId?: string;

  @ApiPropertyOptional({ description: 'Responsibility Center Code', example: 'RC-001' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  responsibilityCenterCode?: string;

  @ApiPropertyOptional({ description: 'Responsibility Center Name', example: 'Operations' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  responsibilityCenter?: string;

  @ApiPropertyOptional({ description: 'Project Code', example: 'PRJ-001' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  projectCode?: string;

  @ApiPropertyOptional({ description: 'Project Name', example: 'Headquarters Renovation' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  projectName?: string;

  @ApiPropertyOptional({ description: 'Default Account ID', example: '1' })
  @IsOptional()
  @IsString()
  accountId?: string;

  @ApiPropertyOptional({ description: 'Credit Account ID (Default Account)', example: '1' })
  @IsOptional()
  @IsString()
  creditAccountId?: string;

  @ApiPropertyOptional({ description: 'Default Account Code', example: '1010101000' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  accountCode?: string;

  @ApiPropertyOptional({ description: 'Default Account Title', example: 'Petty Cash Fund' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  accountTitle?: string;

  @ApiPropertyOptional({ description: 'Transaction Voucher Number', example: 'PCV-2026-000001' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  voucherNo?: string;

  @ApiPropertyOptional({ description: 'Transaction Number alias', example: 'PCV-2026-000001' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  transactionNo?: string;

  @ApiProperty({ description: 'Document Date', example: '2026-05-21' })
  @IsDateString()
  documentDate: string;

  @ApiPropertyOptional({ description: 'Currency code', default: 'PHP', example: 'PHP' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  currencyCode?: string;

  @ApiPropertyOptional({ description: 'Currency alias', default: 'PHP', example: 'PHP' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  currency?: string;

  @ApiPropertyOptional({ description: 'Exchange Rate', default: 1.0, example: 1.0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  exchangeRate?: number;

  @ApiPropertyOptional({ description: 'Gross Amount', default: 0, example: 5000.0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  grossAmount?: number;

  @ApiPropertyOptional({ description: 'Voucher Amount (alias for net amount/total)', default: 0, example: 5000.0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  amount?: number;

  @ApiPropertyOptional({ description: 'Net Amount', default: 0, example: 4500.0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  netAmount?: number;

  @ApiPropertyOptional({ description: 'VAT Type', example: 'VAT Inclusive' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  vatType?: string;

  @ApiPropertyOptional({ description: 'VATable flag', example: 'True' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  vatable?: string;

  @ApiPropertyOptional({ description: 'VAT Rate Description or Code', example: '12%' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  vatRate?: string;

  @ApiPropertyOptional({ description: 'VAT Percent', default: 0, example: 12.0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  vatPercent?: number;

  @ApiPropertyOptional({ description: 'VAT Amount', default: 0, example: 600.0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  vatAmount?: number;

  @ApiPropertyOptional({ description: 'EWT Code', example: 'WC100' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  ewtCode?: string;

  @ApiPropertyOptional({ description: 'EWT Rate description', example: '2%' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  ewtRate?: string;

  @ApiPropertyOptional({ description: 'EWT Percent', default: 0, example: 2.0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  ewtPercent?: number;

  @ApiPropertyOptional({ description: 'EWT Amount', default: 0, example: 100.0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  ewtAmount?: number;

  @ApiPropertyOptional({ description: 'Remarks', example: 'Office supplies expense' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  remarks?: string;

  @ApiPropertyOptional({ description: 'Initial Status', enum: PettyCashVoucherStatus, default: PettyCashVoucherStatus.DRAFT })
  @IsOptional()
  @IsEnum(PettyCashVoucherStatus)
  status?: PettyCashVoucherStatus;
}
