import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import {
  PaymentTypeClassification,
  PaymentTypeStatus,
} from '@prisma/client';

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
  @IsEnum(PaymentTypeStatus)
  status?: PaymentTypeStatus;
}
