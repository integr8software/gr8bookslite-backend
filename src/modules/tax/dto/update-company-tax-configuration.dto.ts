import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateCompanyTaxConfigurationDto {
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  isDefaultForSales?: boolean;

  @IsOptional()
  @IsBoolean()
  isDefaultForPurchases?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  registrationNumber?: string | null;
}
