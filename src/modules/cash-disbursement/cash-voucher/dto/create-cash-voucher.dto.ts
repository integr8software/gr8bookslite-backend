import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CashVoucherStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { CashVoucherDetailDto } from './cash-voucher-detail.dto';

export class CreateCashVoucherDto {
  @ApiPropertyOptional({ description: 'Branch Unit ID', example: 1 })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  branchUnitId?: number;

  @ApiPropertyOptional({ description: 'Party Primary Key ID', example: '1' })
  @IsString()
  @IsOptional()
  partyId?: string;

  @ApiProperty({ description: 'Party Code (Vendor/Employee/Customer)', example: 'SUP-001' })
  @IsString()
  @IsNotEmpty()
  partyCode: string;

  @ApiProperty({ description: 'Party Name', example: 'National Bookstore' })
  @IsString()
  @IsNotEmpty()
  partyName: string;

  @ApiPropertyOptional({ description: 'Chart Account Primary Key ID (Cash/Bank)', example: '1' })
  @IsString()
  @IsOptional()
  creditAccountId?: string;

  @ApiPropertyOptional({ description: 'Custom/Suggested Voucher Sequence No', example: 'CV-2026-000001' })
  @IsString()
  @IsOptional()
  voucherNo?: string;

  @ApiProperty({ description: 'Voucher Document Date in YYYY-MM-DD format', example: '2026-06-11' })
  @IsDateString()
  @IsNotEmpty()
  voucherDate: string;

  @ApiPropertyOptional({ description: 'Payment Due Date in YYYY-MM-DD format', example: '2026-06-11' })
  @IsDateString()
  @IsOptional()
  paymentDueDate?: string;

  @ApiPropertyOptional({ description: 'Reference No', example: 'REF-001' })
  @IsString()
  @IsOptional()
  referenceNo?: string;

  @ApiPropertyOptional({ description: 'Source Reference Module', example: 'Accounts Payable Voucher' })
  @IsString()
  @IsOptional()
  referenceModule?: string;

  @ApiPropertyOptional({ description: 'Voucher Reference No', example: 'APV-2026-0001' })
  @IsString()
  @IsOptional()
  voucherReferenceNo?: string;

  @ApiPropertyOptional({ description: 'Invoice Reference No', example: 'INV-2026-0001' })
  @IsString()
  @IsOptional()
  invoiceReferenceNo?: string;

  @ApiPropertyOptional({ description: 'Payment Method', example: 'Cash', default: 'Cash' })
  @IsString()
  @IsOptional()
  paymentMethod?: string;

  @ApiPropertyOptional({ description: 'Disbursement Type', example: 'Vendor Payment' })
  @IsString()
  @IsOptional()
  disbursementType?: string;

  @ApiPropertyOptional({ description: 'Cost Center / Project Code', example: 'CC-01' })
  @IsString()
  @IsOptional()
  costCenter?: string;

  @ApiPropertyOptional({ description: 'Project Name / Reference', example: 'Main Office Expansion' })
  @IsString()
  @IsOptional()
  projectName?: string;

  @ApiPropertyOptional({ description: 'Prepared By Name', example: 'John Doe' })
  @IsString()
  @IsOptional()
  preparedBy?: string;

  @ApiPropertyOptional({ description: 'Currency Code', example: 'PHP', default: 'PHP' })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiPropertyOptional({ description: 'Exchange Rate', example: '1.0000', default: '1.0000' })
  @IsOptional()
  fxRate?: string | number;

  @ApiPropertyOptional({ description: 'Total Voucher Amount', example: 5000.0 })
  @IsOptional()
  amount?: string | number;

  @ApiPropertyOptional({ description: 'Remarks / Memo', example: 'Disbursement for supplies' })
  @IsString()
  @IsOptional()
  remarks?: string;

  @ApiPropertyOptional({ description: 'Voucher Status', enum: CashVoucherStatus, default: CashVoucherStatus.DRAFT })
  @IsEnum(CashVoucherStatus)
  @IsOptional()
  status?: CashVoucherStatus;

  @ApiProperty({ description: 'Voucher Line Entries / Details', type: [CashVoucherDetailDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CashVoucherDetailDto)
  details: CashVoucherDetailDto[];
}
