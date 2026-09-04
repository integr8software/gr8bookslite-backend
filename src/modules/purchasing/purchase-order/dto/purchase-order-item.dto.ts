import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class PurchaseOrderItemDto {
  @ApiPropertyOptional() @IsOptional() @IsString() purchaseRequestEntryId?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() responsibilityCenterId?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() serviceMaintenanceId?: string | null;
  @ApiPropertyOptional({ maxLength: 100 }) @IsOptional() @IsString() @MaxLength(100) itemId?: string | null;
  @ApiPropertyOptional({ maxLength: 80 }) @IsOptional() @IsString() @MaxLength(80) itemCode?: string | null;
  @ApiPropertyOptional({ maxLength: 80 }) @IsOptional() @IsString() @MaxLength(80) barcode?: string | null;
  @ApiProperty({ maxLength: 255 }) @IsString() @MaxLength(255) description!: string;
  @ApiPropertyOptional({ maxLength: 80 }) @IsOptional() @IsString() @MaxLength(80) color?: string | null;
  @ApiPropertyOptional({ maxLength: 80 }) @IsOptional() @IsString() @MaxLength(80) brand?: string | null;
  @ApiPropertyOptional({ maxLength: 80 }) @IsOptional() @IsString() @MaxLength(80) size?: string | null;
  @ApiPropertyOptional({ maxLength: 80 }) @IsOptional() @IsString() @MaxLength(80) model?: string | null;
  @ApiPropertyOptional({ maxLength: 40 }) @IsOptional() @IsString() @MaxLength(40) uom?: string | null;
  @ApiPropertyOptional({ maxLength: 80 }) @IsOptional() @IsString() @MaxLength(80) lotNo?: string | null;
  @ApiProperty({ minimum: 0 }) @Type(() => Number) @IsNumber() @Min(0) prQty!: number;
  @ApiProperty({ minimum: 0 }) @Type(() => Number) @IsNumber() @Min(0) poQty!: number;
  @ApiProperty({ minimum: 0 }) @Type(() => Number) @IsNumber() @Min(0) price!: number;
  @ApiPropertyOptional({ minimum: 0 }) @IsOptional() @Type(() => Number) @IsNumber() @Min(0) discountRate?: number;
  @ApiPropertyOptional({ minimum: 0 }) @IsOptional() @Type(() => Number) @IsNumber() @Min(0) discountAmount?: number;
  @ApiPropertyOptional({ minimum: 0 }) @IsOptional() @Type(() => Number) @IsNumber() @Min(0) vatAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() vatable?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() vatInclusive?: boolean;
  @ApiPropertyOptional({ maxLength: 80 }) @IsOptional() @IsString() @MaxLength(80) prNo?: string | null;
  @ApiPropertyOptional({ maxLength: 80 }) @IsOptional() @IsString() @MaxLength(80) canvassNo?: string | null;
  @ApiPropertyOptional({ maxLength: 150 }) @IsOptional() @IsString() @MaxLength(150) responsibilityCenter?: string | null;
}
