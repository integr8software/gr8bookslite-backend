import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CashVoucherStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { CashVoucherDetailDto } from './cash-voucher-detail.dto';
import { JournalEntryDto } from './journal-entry.dto';

export class CreateCashVoucherDto {
  @ApiPropertyOptional({ description: 'Branch Unit ID', example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  branchUnitId?: number;

  @ApiPropertyOptional({ description: 'Transaction / Voucher Sequence No', example: 'CV-2026-000001' })
  @IsString()
  @IsOptional()
  @MaxLength(80)
  transactionNo?: string | null;

  @ApiPropertyOptional({ description: 'Voucher No (alias for transactionNo)', example: 'CV-2026-000001' })
  @IsString()
  @IsOptional()
  @MaxLength(80)
  voucherNo?: string | null;

  @ApiPropertyOptional({ description: 'Document Date in YYYY-MM-DD format', example: '2026-06-11' })
  @IsDateString()
  @IsOptional()
  documentDate?: string;

  @ApiPropertyOptional({ description: 'Voucher Date (alias for documentDate)', example: '2026-06-11' })
  @IsDateString()
  @IsOptional()
  voucherDate?: string;

  @ApiPropertyOptional({ description: 'Payment Due Date in YYYY-MM-DD format', example: '2026-06-11' })
  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @ApiPropertyOptional({ description: 'Payment Due Date (alias for dueDate)', example: '2026-06-11' })
  @IsDateString()
  @IsOptional()
  paymentDueDate?: string;

  @ApiPropertyOptional({ description: 'Party Primary Key ID', example: '1' })
  @IsString()
  @IsOptional()
  @MaxLength(40)
  partyId?: string | null;

  @ApiPropertyOptional({ description: 'Party Code (Vendor/Employee/Customer)', example: 'SUP-001' })
  @IsString()
  @IsOptional()
  @MaxLength(80)
  partyCode?: string | null;

  @ApiPropertyOptional({ description: 'Party Name', example: 'National Bookstore' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  partyName?: string | null;

  @ApiPropertyOptional({ description: 'Party Address snapshot', example: '123 Main St, Manila' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  address?: string | null;

  @ApiPropertyOptional({ description: 'Contact Person snapshot', example: 'Jane Doe' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  contactPerson?: string | null;

  @ApiPropertyOptional({ description: 'Contact Number snapshot', example: '09123456789' })
  @IsString()
  @IsOptional()
  @MaxLength(40)
  contactNo?: string | null;

  @ApiPropertyOptional({ description: 'Chart Account Primary Key ID (Cash/Bank Credit Account)', example: '1' })
  @IsString()
  @IsOptional()
  @MaxLength(40)
  creditAccountId?: string | null;

  @ApiPropertyOptional({ description: 'Credit Account Code', example: '1001010000' })
  @IsString()
  @IsOptional()
  @MaxLength(80)
  creditAccountCode?: string;

  @ApiPropertyOptional({ description: 'Credit Account Title', example: 'Cash on Hand' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  creditAccountTitle?: string;

  @ApiPropertyOptional({ description: 'Reference No', example: 'REF-001' })
  @IsString()
  @IsOptional()
  @MaxLength(120)
  referenceNo?: string | null;

  @ApiPropertyOptional({ description: 'Source Reference Module', example: 'Accounts Payable Voucher' })
  @IsString()
  @IsOptional()
  @MaxLength(80)
  referenceModule?: string | null;

  @ApiPropertyOptional({ description: 'Voucher Reference No', example: 'APV-2026-0001' })
  @IsString()
  @IsOptional()
  @MaxLength(120)
  voucherReferenceNo?: string | null;

  @ApiPropertyOptional({ description: 'Invoice Reference No', example: 'INV-2026-0001' })
  @IsString()
  @IsOptional()
  @MaxLength(120)
  invoiceReferenceNo?: string | null;

  @ApiPropertyOptional({ description: 'Payment Method', example: 'Cash', default: 'Cash' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  paymentMethod?: string | null;

  @ApiPropertyOptional({ description: 'Disbursement Type', example: 'Vendor Payment' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  disbursementType?: string | null;

  @ApiPropertyOptional({ description: 'Cost Center snapshot', example: 'CC-01' })
  @IsString()
  @IsOptional()
  @MaxLength(80)
  costCenter?: string | null;

  @ApiPropertyOptional({ description: 'Project Code', example: 'PRJ-01' })
  @IsString()
  @IsOptional()
  @MaxLength(80)
  projectCode?: string | null;

  @ApiPropertyOptional({ description: 'Project Name', example: 'Main Office Expansion' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  projectName?: string | null;

  @ApiPropertyOptional({ description: 'Prepared By Name', example: 'John Doe' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  preparedBy?: string | null;

  @ApiPropertyOptional({ description: 'Currency Code', example: 'PHP', default: 'PHP' })
  @IsString()
  @IsOptional()
  @MaxLength(10)
  currency?: string | null;

  @ApiPropertyOptional({ description: 'Currency Code (alias)', example: 'PHP' })
  @IsString()
  @IsOptional()
  @MaxLength(10)
  currencyCode?: string | null;

  @ApiPropertyOptional({ description: 'Exchange Rate', example: 1.0, default: 1.0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(0.000001)
  exchangeRate?: number;

  @ApiPropertyOptional({ description: 'FX Rate (alias for exchangeRate)', example: 1.0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(0.000001)
  fxRate?: number;

  @ApiPropertyOptional({ description: 'Total Voucher Amount', example: 5000.0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  amount?: number;

  @ApiPropertyOptional({ description: 'Remarks / Memo', example: 'Disbursement for supplies' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  remarks?: string | null;

  @ApiPropertyOptional({ description: 'Voucher Status', enum: CashVoucherStatus, default: CashVoucherStatus.DRAFT })
  @IsEnum(CashVoucherStatus)
  @IsOptional()
  status?: CashVoucherStatus;

  @ApiPropertyOptional({ description: 'Voucher Line Entries / Details', type: [CashVoucherDetailDto] })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CashVoucherDetailDto)
  details?: CashVoucherDetailDto[];

  @ApiPropertyOptional({ description: 'Journal Entries', type: [JournalEntryDto] })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => JournalEntryDto)
  journalEntries?: JournalEntryDto[];
}
