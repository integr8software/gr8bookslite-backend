import { Module } from '@nestjs/common';
import { AccessControlModule } from '../../../common/access/access-control.module';
import { PrismaModule } from '../../../prisma/prisma.module';
import { AuthModule } from '../../auth/auth.module';
import { TransactionNumberSequencesModule } from '../../system-administration/transaction-number-sequences/transaction-number-sequences.module';
import { ServiceInvoiceController } from './service-invoice.controller';
import { ServiceInvoiceService } from './service-invoice.service';
import { ServiceInvoiceAccountingService } from './services/service-invoice-accounting.service';

@Module({
  imports: [PrismaModule, AccessControlModule, AuthModule, TransactionNumberSequencesModule],
  controllers: [ServiceInvoiceController],
  providers: [ServiceInvoiceService, ServiceInvoiceAccountingService],
})
export class ServiceInvoiceModule {}
