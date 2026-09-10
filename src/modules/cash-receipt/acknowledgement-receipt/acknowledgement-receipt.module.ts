import { Module } from '@nestjs/common';
import { AccessControlModule } from '../../../common/access/access-control.module';
import { PrismaModule } from '../../../prisma/prisma.module';
import { AuthModule } from '../../auth/auth.module';
import { JournalVoucherModule } from '../../general-journal/journal-voucher/journal-voucher.module';
import { TransactionNumberSequencesModule } from '../../system-administration/transaction-number-sequences/transaction-number-sequences.module';
import { AcknowledgementReceiptController } from './acknowledgement-receipt.controller';
import { AcknowledgementReceiptService } from './acknowledgement-receipt.service';
import { AcknowledgementReceiptAccountingService } from './services/acknowledgement-receipt-accounting.service';

@Module({
  imports: [PrismaModule, AccessControlModule, AuthModule, JournalVoucherModule, TransactionNumberSequencesModule],
  controllers: [AcknowledgementReceiptController],
  providers: [AcknowledgementReceiptService, AcknowledgementReceiptAccountingService],
})
export class AcknowledgementReceiptModule {}
