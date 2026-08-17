import { PartialType } from '@nestjs/swagger';
import { CreateBillingDto } from './create-billing.dto';

export class UpdateBillingDto extends PartialType(CreateBillingDto) {}
