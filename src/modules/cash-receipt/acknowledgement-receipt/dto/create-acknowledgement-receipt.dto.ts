import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsDateString, IsInt, IsNumber, IsOptional, IsString, MaxLength, Min, ValidateNested } from 'class-validator';
import { AcknowledgementReceiptDetailDto } from './acknowledgement-receipt-detail.dto';
import { AcknowledgementReceiptJournalEntryDto } from './acknowledgement-receipt-journal-entry.dto';

export class CreateAcknowledgementReceiptDto {
  @ApiPropertyOptional({ example: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  branchUnitId?: number;

  @ApiPropertyOptional({ example: 'AR-000001', maxLength: 80, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  transactionNo?: string | null;

  @ApiProperty({ example: '2026-09-03', format: 'date' })
  @IsDateString()
  documentDate!: string;

  @ApiProperty({ example: '2026-09-03', format: 'date' })
  @IsDateString()
  dueDate!: string;

  @ApiPropertyOptional({ example: 'AR-REF-0001', maxLength: 120, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  receiptNo?: string | null;

  @ApiPropertyOptional({ example: 'SOA-0001', maxLength: 120, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  referenceNo?: string | null;

  @ApiPropertyOptional({ example: '1', maxLength: 40, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  partyId?: string | null;

  @ApiProperty({ example: 'CUST-001', maxLength: 80 })
  @IsString()
  @MaxLength(80)
  customerCode!: string;

  @ApiProperty({ example: 'Acme Corporation', maxLength: 255 })
  @IsString()
  @MaxLength(255)
  customerName!: string;

  @ApiPropertyOptional({ example: 'Acme Corporation', maxLength: 255, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  billToName?: string | null;

  @ApiPropertyOptional({ example: '1', maxLength: 40, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  paymentId?: string | null;

  @ApiProperty({ example: 'PHP', maxLength: 10 })
  @IsString()
  @MaxLength(10)
  currency!: string;

  @ApiProperty({ example: 1, minimum: 0.000001 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(0.000001)
  exchangeRate!: number;

  @ApiProperty({ example: 44000 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  netAmount!: number;

  @ApiProperty({ example: 6000 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  vatAmount!: number;

  @ApiProperty({ example: 0 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  wvatAmount!: number;

  @ApiProperty({ example: 1000 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  ewtAmount!: number;

  @ApiProperty({ example: 0 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  discountAmount!: number;

  @ApiProperty({ example: 50000 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  grossAmount!: number;

  @ApiPropertyOptional({ example: '1', maxLength: 40, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  receivableAccountId?: string | null;

  @ApiProperty({ example: '1100000000', maxLength: 20 })
  @IsString()
  @MaxLength(20)
  receivableAccountCode!: string;

  @ApiProperty({ example: 'Accounts Receivable', maxLength: 250 })
  @IsString()
  @MaxLength(250)
  receivableAccountTitle!: string;

  @ApiPropertyOptional({ example: 'Partial collection for September billing.', maxLength: 500, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  remarks?: string | null;

  @ApiProperty({ type: [AcknowledgementReceiptDetailDto], minItems: 1 })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AcknowledgementReceiptDetailDto)
  details!: AcknowledgementReceiptDetailDto[];

  @ApiProperty({ type: [AcknowledgementReceiptJournalEntryDto], minItems: 2 })
  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => AcknowledgementReceiptJournalEntryDto)
  journalEntries!: AcknowledgementReceiptJournalEntryDto[];
}
