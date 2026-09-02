import { Module } from '@nestjs/common';
import { AccessControlModule } from '../../../common/access/access-control.module';
import { PrismaModule } from '../../../prisma/prisma.module';
import { AuthModule } from '../../auth/auth.module';
import { TransactionNumberSequencesModule } from '../../system-administration/transaction-number-sequences/transaction-number-sequences.module';
import { ProvisionalReceiptController } from './provisional-receipt.controller';
import { ProvisionalReceiptService } from './provisional-receipt.service';
import { ProvisionalReceiptAccountingService } from './services/provisional-receipt-accounting.service';

@Module({
  imports: [PrismaModule, AccessControlModule, AuthModule, TransactionNumberSequencesModule],
  controllers: [ProvisionalReceiptController],
  providers: [ProvisionalReceiptService, ProvisionalReceiptAccountingService],
})
export class ProvisionalReceiptModule {}
