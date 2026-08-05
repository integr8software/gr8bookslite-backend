import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsDefined, IsIn, IsNumber, IsOptional, IsString, MaxLength, Min, ValidateNested } from 'class-validator';
import { JournalEntryDetailsDto } from './journal-entry-details.dto';
import { JournalEntryHeaderDto } from './journal-entry-header.dto';

export class JournalEntryDto extends JournalEntryDetailsDto {
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
  @MaxLength(500)
  particulars?: string | null;
}

export class JournalEntrySeparatedDto {
  @IsDefined()
  @ValidateNested()
  @Type(() => JournalEntryHeaderDto)
  header!: JournalEntryHeaderDto;

  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => JournalEntryDetailsDto)
  details!: JournalEntryDetailsDto[];
}
