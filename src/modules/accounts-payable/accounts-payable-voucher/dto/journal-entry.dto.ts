import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsDefined, IsIn, IsNumber, IsOptional, IsString, MaxLength, Min, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { JournalEntryDetailsDto } from './journal-entry-details.dto';
import { JournalEntryHeaderDto } from './journal-entry-header.dto';

export class JournalEntryDto extends JournalEntryDetailsDto {
  @ApiPropertyOptional({ enum: ['APV'] })
  @IsOptional()
  @IsIn(['APV'])
  referenceType?: 'APV';

  @ApiProperty({ maxLength: 10 })
  @IsString()
  @MaxLength(10)
  currencyCode!: string;

  @ApiProperty({ minimum: 0.000001 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(0.000001)
  exchangeRate!: number;

  @ApiPropertyOptional({ maxLength: 500, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  particulars?: string | null;
}

export class JournalEntrySeparatedDto {
  @ApiProperty({ type: JournalEntryHeaderDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => JournalEntryHeaderDto)
  header!: JournalEntryHeaderDto;

  @ApiProperty({ minItems: 2, type: [JournalEntryDetailsDto] })
  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => JournalEntryDetailsDto)
  details!: JournalEntryDetailsDto[];
}
