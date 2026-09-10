import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsNumber, IsString, MaxLength, Min, ValidateIf } from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class UpsertItemPricingDto {
  @ApiPropertyOptional({ type: Number, default: 0, minimum: 0 })
  @ValidateIf((_o, value) => value !== undefined)
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  cost?: number;

  @ApiPropertyOptional({ type: Number, default: 0, minimum: 0 })
  @ValidateIf((_o, value) => value !== undefined)
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  sellingPrice?: number;

  @ApiPropertyOptional({ type: Number, default: 0, minimum: 0 })
  @ValidateIf((_o, value) => value !== undefined)
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  suggestedPrice?: number;

  @ApiPropertyOptional({ type: String, maxLength: 100, nullable: true })
  @ValidateIf((_o, value) => value !== undefined && value !== null)
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  taxTreatment?: string | null;
}

export class ItemPricingResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  itemId!: string;

  @ApiProperty({ type: Number })
  cost!: number;

  @ApiProperty({ type: Number })
  sellingPrice!: number;

  @ApiProperty({ type: Number })
  suggestedPrice!: number;

  @ApiPropertyOptional({ type: String, nullable: true })
  taxTreatment?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  updatedAt?: string | null;
}
