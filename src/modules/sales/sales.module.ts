import { Module } from '@nestjs/common';
import { BillingModule } from './billing/billing.module';
import { BillingStatementModule } from './billing-statement/billing-statement.module';
import { ServiceInvoiceModule } from './service-invoice/service-invoice.module';
import { BillingInvoiceModule } from './billing-invoice/billing-invoice.module';

@Module({
  imports: [ServiceInvoiceModule, BillingInvoiceModule, BillingStatementModule, BillingModule],
})
export class SalesModule {}
