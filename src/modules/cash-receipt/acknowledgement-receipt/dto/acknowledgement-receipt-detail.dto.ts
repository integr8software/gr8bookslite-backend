import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class AcknowledgementReceiptDetailDto {
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

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  quantity!: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  amount!: number;

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
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  discountPercent!: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  discountAmount!: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  grossAmount!: number;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  vatType?: string | null;

  @IsBoolean()
  vatable!: boolean;

  @IsBoolean()
  vatInclusive!: boolean;

  @IsBoolean()
  withWvat!: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  wvatType?: string | null;

  @IsBoolean()
  withEwt!: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  ewtType?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  responsibilityCenterId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  responsibilityCenter?: string | null;
}
