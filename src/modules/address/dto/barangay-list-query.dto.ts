import { IsOptional, IsString } from 'class-validator';

export class BarangayListQueryDto {
  @IsOptional()
  @IsString()
  regionCode?: string;

  @IsOptional()
  @IsString()
  provinceCode?: string;

  @IsOptional()
  @IsString()
  cityMunicipalityCode?: string;
}
