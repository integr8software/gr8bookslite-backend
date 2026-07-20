import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { TaxMaintenanceStatus } from '@prisma/client';

export class CreateTaxMaintenanceDto {
  @IsString()
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string | null;

  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @Max(100)
  percentage!: number;

  @IsString()
  @IsNotEmpty()
  inputVatAccountId!: string;

  @IsString()
  @IsNotEmpty()
  outputVatAccountId!: string;

  @IsString()
  @IsNotEmpty()
  deferredVatAccountId!: string;

  @IsString()
  @IsNotEmpty()
  expandedWithholdingTaxAccountId!: string;

  @IsString()
  @IsNotEmpty()
  creditableWithholdingTaxAccountId!: string;

  @IsString()
  @IsNotEmpty()
  withholdingVatableTaxAccountId!: string;

  @IsString()
  @IsNotEmpty()
  finalWithholdingTaxAccountId!: string;

  @IsOptional()
  @IsEnum(TaxMaintenanceStatus)
  status?: TaxMaintenanceStatus;
}
