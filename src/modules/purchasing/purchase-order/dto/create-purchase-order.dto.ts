import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsDateString, IsNumber, IsOptional, IsString, MaxLength, Min, ValidateNested } from 'class-validator';
import { PurchaseOrderItemDto } from './purchase-order-item.dto';

export class CreatePurchaseOrderDto {
  @ApiPropertyOptional({ minimum: 1 }) @IsOptional() @Type(() => Number) @Min(1) branchUnitId?: number;
  @ApiProperty({ maxLength: 80 }) @IsString() @MaxLength(80) transNo!: string;
  @ApiProperty() @IsDateString() poDate!: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() dateNeeded?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() partyId?: string | null;
  @ApiPropertyOptional({ maxLength: 80 }) @IsOptional() @IsString() @MaxLength(80) partyCode?: string | null;
  @ApiProperty({ maxLength: 20 }) @IsString() @MaxLength(20) purchaseType!: string;
  @ApiPropertyOptional({ maxLength: 500 }) @IsOptional() @IsString() @MaxLength(500) address?: string | null;
  @ApiPropertyOptional({ maxLength: 255 }) @IsOptional() @IsString() @MaxLength(255) emailAddress?: string | null;
  @ApiPropertyOptional({ maxLength: 80 }) @IsOptional() @IsString() @MaxLength(80) contactNo?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() projectResponsibilityCenterId?: string | null;
  @ApiPropertyOptional({ maxLength: 80 }) @IsOptional() @IsString() @MaxLength(80) projectCode?: string | null;
  @ApiPropertyOptional({ maxLength: 255 }) @IsOptional() @IsString() @MaxLength(255) projectName?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() termId?: string | null;
  @ApiPropertyOptional({ maxLength: 150 }) @IsOptional() @IsString() @MaxLength(150) termsOfPayment?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() purchaseRequestId?: string | null;
  @ApiPropertyOptional({ maxLength: 80 }) @IsOptional() @IsString() @MaxLength(80) prNo?: string | null;
  @ApiPropertyOptional({ maxLength: 10, default: 'PHP' }) @IsOptional() @IsString() @MaxLength(10) currency?: string;
  @ApiPropertyOptional({ minimum: 0, default: 1 }) @IsOptional() @Type(() => Number) @IsNumber() @Min(0) exchangeRate?: number;
  @ApiPropertyOptional({ maxLength: 500 }) @IsOptional() @IsString() @MaxLength(500) remarks?: string | null;
  @ApiProperty({ type: [PurchaseOrderItemDto], minItems: 1 }) @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => PurchaseOrderItemDto) items!: PurchaseOrderItemDto[];
}
