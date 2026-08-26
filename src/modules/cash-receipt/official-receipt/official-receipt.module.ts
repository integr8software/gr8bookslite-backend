import { Module } from '@nestjs/common';
import { AccessControlModule } from '../../../common/access/access-control.module';
import { PrismaModule } from '../../../prisma/prisma.module';
import { AuthModule } from '../../auth/auth.module';
import { TransactionNumberSequencesModule } from '../../system-administration/transaction-number-sequences/transaction-number-sequences.module';
import { OfficialReceiptController } from './official-receipt.controller';
import { OfficialReceiptService } from './official-receipt.service';
import { OfficialReceiptAccountingService } from './services/official-receipt-accounting.service';

@Module({
  imports: [PrismaModule, AccessControlModule, AuthModule, TransactionNumberSequencesModule],
  controllers: [OfficialReceiptController],
  providers: [OfficialReceiptService, OfficialReceiptAccountingService],
})
export class OfficialReceiptModule {}
