import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsDateString, IsInt, IsNumber, IsOptional, IsString, MaxLength, Min, ValidateNested } from 'class-validator';
import { OfficialReceiptDetailDto } from './official-receipt-detail.dto';
import { OfficialReceiptJournalEntryDto } from './official-receipt-journal-entry.dto';

export class CreateOfficialReceiptDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  branchUnitId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  transactionNo?: string | null;

  @IsDateString()
  documentDate!: string;

  @IsDateString()
  dueDate!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  receiptNo?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  referenceNo?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  partyId?: string | null;

  @IsString()
  @MaxLength(80)
  customerCode!: string;

  @IsString()
  @MaxLength(255)
  customerName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  billToName?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  contactPerson?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  contactNo?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  businessStyle?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  projectCode?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  projectName?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  projectRef?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  salesAssociate?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  teamAssigned?: string | null;

  @IsString()
  @MaxLength(10)
  currency!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(0.000001)
  exchangeRate!: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  netAmount!: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  vatAmount!: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  wvatAmount!: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  ewtAmount!: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  discountAmount!: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  grossAmount!: number;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  termId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  terms?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  receivableAccountId?: string | null;

  @IsString()
  @MaxLength(20)
  receivableAccountCode!: string;

  @IsString()
  @MaxLength(250)
  receivableAccountTitle!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  remarks?: string | null;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OfficialReceiptDetailDto)
  details!: OfficialReceiptDetailDto[];

  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => OfficialReceiptJournalEntryDto)
  journalEntries!: OfficialReceiptJournalEntryDto[];
}
