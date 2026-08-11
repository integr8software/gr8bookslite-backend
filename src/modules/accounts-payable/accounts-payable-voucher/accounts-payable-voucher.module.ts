import { Module } from '@nestjs/common';
import { AccessControlModule } from '../../../common/access/access-control.module';
import { CompanyCurrencyModule } from '../../../common/currency/company-currency.module';
import { PrismaModule } from '../../../prisma/prisma.module';
import { AuthModule } from '../../auth/auth.module';
import { TransactionNumberSequencesModule } from '../../system-administration/transaction-number-sequences/transaction-number-sequences.module';
import { AccountsPayableVoucherController } from './accounts-payable-voucher.controller';
import { AccountsPayableVoucherService } from './accounts-payable-voucher.service';
import { AccountsPayableVoucherAccountingService } from './services/accounts-payable-voucher-accounting.service';
import { AccountsPayableVoucherLookupService } from './services/accounts-payable-voucher-lookup.service';

@Module({
  imports: [PrismaModule, CompanyCurrencyModule, AccessControlModule, AuthModule, TransactionNumberSequencesModule],
  controllers: [AccountsPayableVoucherController],
  providers: [AccountsPayableVoucherService, AccountsPayableVoucherAccountingService, AccountsPayableVoucherLookupService],
})
export class AccountsPayableVoucherModule {}
