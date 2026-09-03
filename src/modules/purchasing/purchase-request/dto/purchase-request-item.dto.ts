import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class PurchaseRequestItemDto {
  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  itemId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  serviceMaintenanceId?: string | null;

  @ApiPropertyOptional({ maxLength: 80 })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  itemCode?: string | null;

  @ApiPropertyOptional({ maxLength: 80 })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  barcode?: string | null;

  @ApiPropertyOptional({ maxLength: 255 })
  @IsString()
  @MaxLength(255)
  description!: string;

  @ApiPropertyOptional({ maxLength: 40 })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  uom?: string | null;

  @ApiPropertyOptional({ minimum: 0 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  qty!: number;

  @ApiPropertyOptional({ maxLength: 80 })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  lotNo?: string | null;

  @ApiPropertyOptional({ minimum: 0 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  cost!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  responsibilityCenterId?: string | null;

  @ApiPropertyOptional({ maxLength: 150 })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  responsibilityCenter?: string | null;
}
