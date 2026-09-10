import { Module } from '@nestjs/common';
import { AccessControlModule } from '../../../common/access/access-control.module';
import { CompanyCurrencyModule } from '../../../common/currency/company-currency.module';
import { PrismaModule } from '../../../prisma/prisma.module';
import { AuthModule } from '../../auth/auth.module';
import { JournalVoucherModule } from '../../general-journal/journal-voucher/journal-voucher.module';
import { TransactionNumberSequencesModule } from '../../system-administration/transaction-number-sequences/transaction-number-sequences.module';
import { AccountsPayableVoucherController } from './accounts-payable-voucher.controller';
import { AccountsPayableVoucherService } from './accounts-payable-voucher.service';
import { AccountsPayableVoucherCopySourceService } from './copy-from/accounts-payable-voucher-copy-source.service';
import { AccountsPayableVoucherAccountingService } from './services/accounts-payable-voucher-accounting.service';
import { AccountsPayableVoucherLookupService } from './services/accounts-payable-voucher-lookup.service';

@Module({
  imports: [PrismaModule, CompanyCurrencyModule, AccessControlModule, AuthModule, JournalVoucherModule, TransactionNumberSequencesModule],
  controllers: [AccountsPayableVoucherController],
  providers: [
    AccountsPayableVoucherService,
    AccountsPayableVoucherAccountingService,
    AccountsPayableVoucherLookupService,
    AccountsPayableVoucherCopySourceService,
  ],
  exports: [AccountsPayableVoucherCopySourceService],
})
export class AccountsPayableVoucherModule {}
