import { Module } from '@nestjs/common';
import { AccessControlModule } from '../../../common/access/access-control.module';
import { PrismaModule } from '../../../prisma/prisma.module';
import { AuthModule } from '../../auth/auth.module';
import { TransactionNumberSequencesModule } from '../../system-administration/transaction-number-sequences/transaction-number-sequences.module';
import { AccountsPayableVoucherController } from './accounts-payable-voucher.controller';
import { AccountsPayableVoucherService } from './accounts-payable-voucher.service';
import { AccountsPayableVoucherAccountingService } from './services/accounts-payable-voucher-accounting.service';

@Module({
  imports: [PrismaModule, AccessControlModule, AuthModule, TransactionNumberSequencesModule],
  controllers: [AccountsPayableVoucherController],
  providers: [AccountsPayableVoucherService, AccountsPayableVoucherAccountingService],
})
export class AccountsPayableVoucherModule {}
