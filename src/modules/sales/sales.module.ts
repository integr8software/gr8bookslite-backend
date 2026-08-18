import { Module } from '@nestjs/common';
import { ServiceInvoiceModule } from './service-invoice/service-invoice.module';
import { BillingInvoiceModule } from './billing-invoice/billing-invoice.module';
import { BillingModule } from './billing/billing.module';

@Module({
  imports: [ServiceInvoiceModule, BillingInvoiceModule, BillingModule],
})
export class SalesModule {}
