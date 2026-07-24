import { TaxCalculationMethod, TaxMaintenanceStatus } from '@prisma/client';
import { IsDateString, IsEnum, IsNumber, IsOptional, Max, Min } from 'class-validator';

export class CreateTaxRateVersionDto {
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(0)
  @Max(100)
  percentage!: number;

  @IsEnum(TaxCalculationMethod)
  calculationMethod!: TaxCalculationMethod;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @Max(100)
  recoverablePercentage?: number;

  @IsDateString()
  effectiveFrom!: string;

  @IsOptional()
  @IsDateString()
  effectiveTo?: string | null;

  @IsOptional()
  @IsEnum(TaxMaintenanceStatus)
  status?: TaxMaintenanceStatus;
}
