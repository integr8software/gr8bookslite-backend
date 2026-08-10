import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsDateString, IsIn, IsInt, IsNumber, IsOptional, IsString, MaxLength, Min, ValidateNested } from 'class-validator';
import { AccountsPayableVoucherDetailsDto } from './accounts-payable-voucher-details.dto';
import { JournalEntryDto } from './journal-entry.dto';

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

  @IsOptional()
  @IsString()
  @MaxLength(40)
  partyId?: string | null;

  @IsString()
  @MaxLength(80)
  partyCode!: string;

  @IsString()
  @MaxLength(255)
  partyName!: string;

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
  projectCode?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  projectName?: string | null;

  @IsString()
  @MaxLength(10)
  currency!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(0.000001)
  exchangeRate!: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  amount!: number;

  @IsString()
  @MaxLength(40)
  termId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  terms?: string | null;

  @IsDateString()
  dueDate!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  referenceNo?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  creditAccountId?: string | null;

  @IsString()
  @MaxLength(20)
  creditAccountCode!: string;

  @IsString()
  @MaxLength(250)
  creditAccountTitle!: string;

  @IsIn(AccountsPayableVoucherPayableTypeInputValues)
  payableType!: (typeof AccountsPayableVoucherPayableTypeInputValues)[number];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  remarks?: string | null;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AccountsPayableVoucherDetailsDto)
  details!: AccountsPayableVoucherDetailsDto[];

  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => JournalEntryDto)
  journalEntries!: JournalEntryDto[];
}
