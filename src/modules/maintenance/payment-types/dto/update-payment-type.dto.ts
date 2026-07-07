import { PartialType } from '@nestjs/swagger';
import { CreatePaymentTypeDto } from './create-payment-type.dto';

export class UpdatePaymentTypeDto extends PartialType(CreatePaymentTypeDto) {}
