import { Module } from '@nestjs/common';
import { AccessControlModule } from '../../../common/access/access-control.module';
import { PrismaModule } from '../../../prisma/prisma.module';
import { AuthModule } from '../../auth/auth.module';
import { TransactionNumberSequencesModule } from '../../system-administration/transaction-number-sequences/transaction-number-sequences.module';
import { BillingInvoiceController } from './billing-invoice.controller';
import { BillingInvoiceService } from './billing-invoice.service';
import { BillingInvoiceAccountingService } from './services/billing-invoice-accounting.service';

@Module({
  imports: [PrismaModule, AccessControlModule, AuthModule, TransactionNumberSequencesModule],
  controllers: [BillingInvoiceController],
  providers: [BillingInvoiceService, BillingInvoiceAccountingService],
})
export class BillingInvoiceModule {}
