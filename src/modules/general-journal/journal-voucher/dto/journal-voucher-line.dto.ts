import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class JournalVoucherLineDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  lineNumber!: number;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  accountId?: string | null;

  @IsString()
  @MaxLength(20)
  accountCode!: string;

  @IsOptional()
  @IsString()
  @MaxLength(250)
  accountTitle?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  particulars?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  partyId?: string | null;

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
  @MaxLength(40)
  responsibilityCenterId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  responsibilityCenter?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  refNo?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  vatType?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  atcCode?: string | null;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  debit!: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  credit!: number;
}
