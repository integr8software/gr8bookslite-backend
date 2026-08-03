import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreatePartyAddressDto {
  @ApiProperty({ maxLength: 120 })
  @IsString()
  @MaxLength(120)
  addressName!: string;

  @ApiProperty({ maxLength: 255 })
  @IsString()
  @MaxLength(255)
  addressLine1!: string;

  @ApiProperty({ maxLength: 255 })
  @IsString()
  @MaxLength(255)
  addressLine2!: string;

  @ApiPropertyOptional({ maxLength: 120, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  barangay?: string | null;

  @ApiPropertyOptional({ maxLength: 30, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  barangayCode?: string | null;

  @ApiPropertyOptional({ maxLength: 120, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  cityMunicipality?: string | null;

  @ApiPropertyOptional({ maxLength: 30, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  cityMunicipalityCode?: string | null;

  @ApiPropertyOptional({ maxLength: 120, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  province?: string | null;

  @ApiPropertyOptional({ maxLength: 30, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  provinceCode?: string | null;

  @ApiPropertyOptional({ maxLength: 120, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  region?: string | null;

  @ApiPropertyOptional({ maxLength: 30, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  regionCode?: string | null;

  @ApiProperty()
  @IsBoolean()
  isBilling!: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isBuilding?: boolean;

  @ApiProperty()
  @IsBoolean()
  isDefault!: boolean;

  @ApiProperty()
  @IsBoolean()
  isDelivery!: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isForeign?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isHome?: boolean;
}
