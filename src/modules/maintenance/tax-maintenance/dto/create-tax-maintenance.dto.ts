import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { TaxMaintenanceStatus } from '@prisma/client';

export class CreateTaxMaintenanceDto {
  @IsString()
  @MaxLength(120)
  name!: string;

  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @Max(100)
  percentage!: number;

  @IsOptional()
  @IsString()
  inputVatAccountId?: string | null;

  @IsOptional()
  @IsString()
  outputVatAccountId?: string | null;

  @IsOptional()
  @IsString()
  vatPayableAccountId?: string | null;

  @IsOptional()
  @IsString()
  deferredInputTaxAccountId?: string | null;

  @IsOptional()
  @IsString()
  deferredOutputVatAccountId?: string | null;

  @IsOptional()
  @IsEnum(TaxMaintenanceStatus)
  status?: TaxMaintenanceStatus;
}
