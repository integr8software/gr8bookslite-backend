import {
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreatePartyAddressDto {
  @IsString()
  @MaxLength(120)
  addressName!: string;

  @IsString()
  @MaxLength(255)
  addressLine1!: string;

  @IsString()
  @MaxLength(255)
  addressLine2!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  barangay?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  barangayCode?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  cityMunicipality?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  cityMunicipalityCode?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  province?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  provinceCode?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  region?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  regionCode?: string | null;

  @IsBoolean()
  isBilling!: boolean;

  @IsOptional()
  @IsBoolean()
  isBuilding?: boolean;

  @IsBoolean()
  isDefault!: boolean;

  @IsBoolean()
  isDelivery!: boolean;

  @IsOptional()
  @IsBoolean()
  isForeign?: boolean;

  @IsOptional()
  @IsBoolean()
  isHome?: boolean;
}
