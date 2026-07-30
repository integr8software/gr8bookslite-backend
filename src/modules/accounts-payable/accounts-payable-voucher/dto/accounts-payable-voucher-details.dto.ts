import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class AccountsPayableVoucherDetailsDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  lineNumber!: number;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  partyId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  expenseAccountId?: string | null;

  @IsString()
  @MaxLength(20)
  expenseAccountCode!: string;

  @IsString()
  @MaxLength(250)
  expenseType!: string;

  @IsString()
  @MaxLength(10)
  currencyCode!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(0.000001)
  exchangeRate!: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  amount!: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  netAmount!: number;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  vat?: string | null;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  vatPercent!: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  vatAmount!: number;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  ewt?: string | null;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  ewtPercent!: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  ewtAmount!: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  totalAmountDue!: number;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  partyCode?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  partyName?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  particulars?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  responsibilityCenterId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  responsibilityCenter?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  referenceNo?: string | null;
}
