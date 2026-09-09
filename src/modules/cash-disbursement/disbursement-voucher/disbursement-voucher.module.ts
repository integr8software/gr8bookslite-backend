import { Module } from '@nestjs/common';
import { AccessControlModule } from '../../../common/access/access-control.module';
import { CompanyCurrencyModule } from '../../../common/currency/company-currency.module';
import { PrismaModule } from '../../../prisma/prisma.module';
import { AuthModule } from '../../auth/auth.module';
import { AccountsPayableVoucherModule } from '../../accounts-payable/accounts-payable-voucher/accounts-payable-voucher.module';
import { JournalVoucherModule } from '../../general-journal/journal-voucher/journal-voucher.module';
import { AdvancesToSuppliersModule } from '../advances-to-suppliers/advances-to-suppliers.module';
import { CashAdvanceModule } from '../cash-advance/cash-advance.module';
import { PettyCashReplenishmentModule } from '../petty-cash-replenishment/petty-cash-replenishment.module';
import { RevolvingFundReplenishmentModule } from '../revolving-fund-replenishment/revolving-fund-replenishment.module';
import { TablePreferencesModule } from '../../table-preferences/table-preferences.module';
import { TransactionNumberSequencesModule } from '../../system-administration/transaction-number-sequences/transaction-number-sequences.module';
import { DisbursementVoucherController } from './disbursement-voucher.controller';
import { DisbursementVoucherService } from './disbursement-voucher.service';
import { DisbursementVoucherAccountingService } from './services/disbursement-voucher-accounting.service';

@Module({
  imports: [
    PrismaModule,
    CompanyCurrencyModule,
    AccessControlModule,
    AuthModule,
    AccountsPayableVoucherModule,
    JournalVoucherModule,
    AdvancesToSuppliersModule,
    CashAdvanceModule,
    PettyCashReplenishmentModule,
    RevolvingFundReplenishmentModule,
    TablePreferencesModule,
    TransactionNumberSequencesModule,
  ],
  controllers: [DisbursementVoucherController],
  providers: [DisbursementVoucherService, DisbursementVoucherAccountingService],
  exports: [DisbursementVoucherService, DisbursementVoucherAccountingService],
})
export class DisbursementVoucherModule {}
