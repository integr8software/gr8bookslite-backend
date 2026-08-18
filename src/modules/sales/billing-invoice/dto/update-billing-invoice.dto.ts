import { PartialType } from '@nestjs/swagger';
import { CreateBillingInvoiceDto } from './create-billing-invoice.dto';

export class UpdateBillingInvoiceDto extends PartialType(CreateBillingInvoiceDto) {}
