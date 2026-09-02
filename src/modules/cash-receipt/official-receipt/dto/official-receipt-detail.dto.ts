import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class OfficialReceiptDetailDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  lineNumber!: number;

  @IsString()
  @MaxLength(250)
  description!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  particulars?: string | null;

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
  @MaxLength(120)
  referenceNo?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  vatType?: string | null;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  vatPercent!: number;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  cwtCode?: string | null;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  cwtPercent!: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  netAmount!: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  vatAmount!: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  wvatAmount!: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  ewtAmount!: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  discountAmount!: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  grossAmount!: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  totalReceived!: number;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  responsibilityCenterId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  responsibilityCenter?: string | null;
}
