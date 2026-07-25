import { TaxCalculationMethod, TaxMaintenanceStatus, TaxSystem, TaxTransactionScope, TaxTreatment } from '@prisma/client';
import { IsBoolean, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';

export class CreateTaxDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Za-z0-9][A-Za-z0-9._-]*$/, {
    message: 'Tax code may contain letters, numbers, periods, underscores, and hyphens.',
  })
  @MaxLength(40)
  code!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string | null;

  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Za-z0-9][A-Za-z0-9-]*$/, {
    message: 'Jurisdiction code may contain letters, numbers, and hyphens.',
  })
  @MaxLength(20)
  jurisdictionCode!: string;

  @IsEnum(TaxSystem)
  taxSystem!: TaxSystem;

  @IsEnum(TaxTreatment)
  treatment!: TaxTreatment;

  @IsEnum(TaxTransactionScope)
  transactionScope!: TaxTransactionScope;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @Max(100)
  percentage?: number;

  @IsEnum(TaxCalculationMethod)
  calculationMethod!: TaxCalculationMethod;

  @IsOptional()
  @IsBoolean()
  recoverable?: boolean;

  @IsOptional()
  @IsEnum(TaxMaintenanceStatus)
  status?: TaxMaintenanceStatus;
}
