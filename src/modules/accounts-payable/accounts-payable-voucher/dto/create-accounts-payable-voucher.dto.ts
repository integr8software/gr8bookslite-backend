import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsDateString, IsIn, IsInt, IsNumber, IsOptional, IsString, MaxLength, Min, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AccountsPayableVoucherDetailsDto } from './accounts-payable-voucher-details.dto';
import { JournalEntryDto, JournalEntrySeparatedDto } from './journal-entry.dto';

export const AccountsPayableVoucherPayableTypeInputValues = [
  'TRADE_PAYABLE',
  'NON_TRADE_PAYABLE',
  'EMPLOYEE_PAYABLE',
  'TAX_PAYABLE',
  'ACCRUED_PAYABLE',
  'Trade Payable',
  'Non-Trade Payable',
  'Employee Payable',
  'Tax Payable',
  'Accrued Payable',
] as const;

export class CreateAccountsPayableVoucherDto {
  @ApiPropertyOptional({ minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  branchUnitId?: number;

  @ApiPropertyOptional({ maxLength: 80, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  transactionNo?: string | null;

  @ApiProperty()
  @IsDateString()
  documentDate!: string;

  @ApiPropertyOptional({ maxLength: 40, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  partyId?: string | null;

  @ApiProperty({ maxLength: 80 })
  @IsString()
  @MaxLength(80)
  partyCode!: string;

  @ApiProperty({ maxLength: 255 })
  @IsString()
  @MaxLength(255)
  partyName!: string;

  @ApiPropertyOptional({ maxLength: 500, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string | null;

  @ApiPropertyOptional({ maxLength: 255, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  contactPerson?: string | null;

  @ApiPropertyOptional({ maxLength: 40, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  contactNo?: string | null;

  @ApiPropertyOptional({ maxLength: 80, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  projectCode?: string | null;

  @ApiPropertyOptional({ maxLength: 255, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  projectName?: string | null;

  @ApiProperty({ maxLength: 10 })
  @IsString()
  @MaxLength(10)
  currency!: string;

  @ApiProperty({ minimum: 0.000001 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(0.000001)
  exchangeRate!: number;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  amount!: number;

  @ApiProperty({ maxLength: 40 })
  @IsString()
  @MaxLength(40)
  termId!: string;

  @ApiPropertyOptional({ maxLength: 150, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  terms?: string | null;

  @ApiProperty()
  @IsDateString()
  dueDate!: string;

  @ApiPropertyOptional({ maxLength: 120, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  referenceNo?: string | null;

  @ApiPropertyOptional({ maxLength: 40, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  creditAccountId?: string | null;

  @ApiProperty({ maxLength: 20 })
  @IsString()
  @MaxLength(20)
  creditAccountCode!: string;

  @ApiProperty({ maxLength: 250 })
  @IsString()
  @MaxLength(250)
  creditAccountTitle!: string;

  @ApiProperty({ enum: AccountsPayableVoucherPayableTypeInputValues })
  @IsIn(AccountsPayableVoucherPayableTypeInputValues)
  payableType!: (typeof AccountsPayableVoucherPayableTypeInputValues)[number];

  @ApiPropertyOptional({ maxLength: 500, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  remarks?: string | null;

  @ApiProperty({ minItems: 1, type: [AccountsPayableVoucherDetailsDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AccountsPayableVoucherDetailsDto)
  details!: AccountsPayableVoucherDetailsDto[];

  @ApiPropertyOptional({ minItems: 2, type: [JournalEntryDto] })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => JournalEntryDto)
  journalEntries?: JournalEntryDto[];

  @ApiPropertyOptional({ nullable: true, type: JournalEntrySeparatedDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => JournalEntrySeparatedDto)
  journalEntry?: JournalEntrySeparatedDto | null;
}
