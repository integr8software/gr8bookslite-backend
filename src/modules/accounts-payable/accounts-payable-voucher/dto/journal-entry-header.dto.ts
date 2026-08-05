import { Type } from 'class-transformer';
import { IsIn, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class JournalEntryHeaderDto {
  @IsOptional()
  @IsIn(['APV'])
  referenceType?: 'APV';

  @IsString()
  @MaxLength(10)
  currencyCode!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(0.000001)
  exchangeRate!: number;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  referenceNo?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  particulars?: string | null;
}
