import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaymentTypeClassification } from '@prisma/client';

export class PaymentTypeLookupQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @IsOptional()
  @IsEnum(PaymentTypeClassification)
  classification?: PaymentTypeClassification;
}
