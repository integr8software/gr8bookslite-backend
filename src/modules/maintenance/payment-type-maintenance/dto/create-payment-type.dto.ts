import { IsEnum, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { PaymentTypeClassification, PaymentTypeStatus } from '@prisma/client';

export class CreatePaymentTypeDto {
  @IsString()
  @MaxLength(150)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsEnum(PaymentTypeClassification)
  classification!: PaymentTypeClassification;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsEnum(PaymentTypeStatus)
  status?: PaymentTypeStatus;
}
