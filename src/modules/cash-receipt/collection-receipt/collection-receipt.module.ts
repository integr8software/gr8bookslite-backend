import { Module } from '@nestjs/common';
import { AccessControlModule } from '../../../common/access/access-control.module';
import { PrismaModule } from '../../../prisma/prisma.module';
import { AuthModule } from '../../auth/auth.module';
import { TransactionNumberSequencesModule } from '../../system-administration/transaction-number-sequences/transaction-number-sequences.module';
import { CollectionReceiptController } from './collection-receipt.controller';
import { CollectionReceiptService } from './collection-receipt.service';
import { CollectionReceiptAccountingService } from './services/collection-receipt-accounting.service';

@Module({
  imports: [PrismaModule, AccessControlModule, AuthModule, TransactionNumberSequencesModule],
  controllers: [CollectionReceiptController],
  providers: [CollectionReceiptService, CollectionReceiptAccountingService],
})
export class CollectionReceiptModule {}
