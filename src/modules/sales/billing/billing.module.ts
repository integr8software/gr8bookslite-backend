import { Module } from '@nestjs/common';
import { AccessControlModule } from '../../../common/access/access-control.module';
import { PrismaModule } from '../../../prisma/prisma.module';
import { AuthModule } from '../../auth/auth.module';
import { TransactionNumberSequencesModule } from '../../system-administration/transaction-number-sequences/transaction-number-sequences.module';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { BillingAccountingService } from './services/billing-accounting.service';

@Module({
  imports: [PrismaModule, AccessControlModule, AuthModule, TransactionNumberSequencesModule],
  controllers: [BillingController],
  providers: [BillingService, BillingAccountingService],
})
export class BillingModule {}
