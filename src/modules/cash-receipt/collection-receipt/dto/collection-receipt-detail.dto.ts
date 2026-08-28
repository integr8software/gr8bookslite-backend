import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CollectionReceiptDetailDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  lineNumber!: number;

  @ApiProperty({ example: 'Service Revenue', description: 'Collection Type selected in the item row.' })
  @IsString()
  @MaxLength(250)
  description!: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  particulars?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  partyCode?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  partyName?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  referenceNo?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  vatType?: string | null;

  @ApiProperty({ example: 12 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  vatPercent!: number;

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  cwtCode?: string | null;

  @ApiProperty({ example: 2 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  cwtPercent!: number;

  @ApiProperty({ example: 44000 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  netAmount!: number;

  @ApiProperty({ example: 6000 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  vatAmount!: number;

  @ApiProperty({ example: 1000, description: 'CWT Amount for the collection item.' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  ewtAmount!: number;

  @ApiProperty({ example: 50000 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  grossAmount!: number;

  @ApiProperty({ example: 49000 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  totalReceived!: number;

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  responsibilityCenterId?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  responsibilityCenter?: string | null;
}
