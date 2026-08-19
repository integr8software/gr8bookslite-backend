import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsDateString, IsInt, IsNumber, IsOptional, IsString, MaxLength, Min, ValidateNested } from 'class-validator';
import { JournalVoucherLineDto } from './journal-voucher-line.dto';

export class CreateJournalVoucherDto {
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

  @IsString()
  @MaxLength(10)
  currencyCode!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(0.000001)
  exchangeRate!: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  remarks?: string | null;

  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => JournalVoucherLineDto)
  lines!: JournalVoucherLineDto[];
}
