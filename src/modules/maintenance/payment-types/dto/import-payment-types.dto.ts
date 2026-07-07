import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, ValidateNested } from 'class-validator';
import { CreatePaymentTypeDto } from './create-payment-type.dto';

export class ImportPaymentTypesDto {
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => CreatePaymentTypeDto)
  paymentTypes!: CreatePaymentTypeDto[];
}
