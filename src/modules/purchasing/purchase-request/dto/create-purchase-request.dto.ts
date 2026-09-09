import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsDateString, IsNumber, IsOptional, IsString, MaxLength, Min, ValidateNested } from 'class-validator';
import { PurchaseRequestItemDto } from './purchase-request-item.dto';

export class CreatePurchaseRequestDto {
  @ApiPropertyOptional({ minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  branchUnitId?: number;

  @ApiProperty({ maxLength: 80 })
  @IsString()
  @MaxLength(80)
  transNo!: string;

  @ApiProperty()
  @IsDateString()
  prDate!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  partyId?: string | null;

  @ApiPropertyOptional({ maxLength: 80 })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  partyCode?: string | null;

  @ApiPropertyOptional({ maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  partyName?: string | null;

  @ApiProperty({ maxLength: 80 })
  @IsString()
  @MaxLength(80)
  purchaseType!: string;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  vendorAddress?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  projectResponsibilityCenterId?: string | null;

  @ApiPropertyOptional({ maxLength: 80 })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  projectCode?: string | null;

  @ApiPropertyOptional({ maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  projectName?: string | null;

  @ApiPropertyOptional({ maxLength: 10, default: 'PHP' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  currency?: string | null;

  @ApiPropertyOptional({ minimum: 0, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  exchangeRate?: number;

  @ApiPropertyOptional({ maxLength: 150 })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  forDepartment?: string | null;

  @ApiPropertyOptional({ maxLength: 80 })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  bomNo?: string | null;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  remarks?: string | null;

  @ApiProperty({ type: [PurchaseRequestItemDto], minItems: 1 })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PurchaseRequestItemDto)
  items!: PurchaseRequestItemDto[];
}
