import { Module } from '@nestjs/common';
import { ServiceInvoiceModule } from './service-invoice/service-invoice.module';

@Module({
  imports: [ServiceInvoiceModule],
})
export class SalesModule {}
