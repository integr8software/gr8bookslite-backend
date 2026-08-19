import { Module } from '@nestjs/common';
import { AccessControlModule } from '../../../common/access/access-control.module';
import { PrismaModule } from '../../../prisma/prisma.module';
import { AuthModule } from '../../auth/auth.module';
import { TransactionNumberSequencesModule } from '../../system-administration/transaction-number-sequences/transaction-number-sequences.module';
import { BillingStatementController } from './billing-statement.controller';
import { BillingStatementService } from './billing-statement.service';
import { BillingStatementAccountingService } from './services/billing-statement-accounting.service';

@Module({
  imports: [PrismaModule, AccessControlModule, AuthModule, TransactionNumberSequencesModule],
  controllers: [BillingStatementController],
  providers: [BillingStatementService, BillingStatementAccountingService],
})
export class BillingStatementModule {}
