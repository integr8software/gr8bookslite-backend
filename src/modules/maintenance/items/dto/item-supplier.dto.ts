import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsNumber, IsString, Matches, Max, MaxLength, Min, ValidateIf } from 'class-validator';

export class ItemSupplierDto {
  @ApiProperty({ pattern: '^[1-9][0-9]*$', description: 'Vendor party ID.' })
  @IsString()
  @Matches(/^[1-9][0-9]*$/)
  supplierId!: string;

  @ApiPropertyOptional({ maxLength: 100 })
  @ValidateIf((_o, value) => value !== undefined)
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(100)
  supplierCode?: string;

  @ApiPropertyOptional({ maxLength: 50, example: '3 days' })
  @ValidateIf((_o, value) => value !== undefined)
  @IsString()
  @MaxLength(50)
  @Matches(/^(?:\d+(?:\.\d+)? (?:days|weeks|months))?$/)
  leadTime?: string;

  @ApiProperty({ minimum: 0, maximum: 999999999999.99 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(999999999999.99)
  cost!: number;

  @ApiProperty()
  @IsBoolean()
  isDefault!: boolean;
}

export class ItemSupplierResponseDto extends ItemSupplierDto {
  @ApiProperty() id!: string;
  @ApiProperty() supplierName!: string;
}
