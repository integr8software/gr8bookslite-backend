import { Type } from 'class-transformer';
import { IsIn, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class JournalEntryHeaderDto {
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

  @ApiPropertyOptional({ maxLength: 120, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  referenceNo?: string | null;

  @ApiPropertyOptional({ maxLength: 500, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  particulars?: string | null;
}
