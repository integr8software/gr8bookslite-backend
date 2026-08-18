import { Module } from '@nestjs/common';
import { ServiceInvoiceModule } from './service-invoice/service-invoice.module';
import { BillingModule } from './billing/billing.module';

@Module({
  imports: [ServiceInvoiceModule, BillingModule],
})
export class SalesModule {}
