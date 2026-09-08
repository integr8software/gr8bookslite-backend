import { Module } from '@nestjs/common';
import { AccessControlModule } from '../../../common/access/access-control.module';
import { CompanyCurrencyModule } from '../../../common/currency/company-currency.module';
import { PrismaModule } from '../../../prisma/prisma.module';
import { AuthModule } from '../../auth/auth.module';
import { AccountsPayableVoucherModule } from '../../accounts-payable/accounts-payable-voucher/accounts-payable-voucher.module';
import { AdvancesToSuppliersModule } from '../advances-to-suppliers/advances-to-suppliers.module';
import { PettyCashReplenishmentModule } from '../petty-cash-replenishment/petty-cash-replenishment.module';
import { RevolvingFundReplenishmentModule } from '../revolving-fund-replenishment/revolving-fund-replenishment.module';
import { TablePreferencesModule } from '../../table-preferences/table-preferences.module';
import { TransactionNumberSequencesModule } from '../../system-administration/transaction-number-sequences/transaction-number-sequences.module';
import { CashVoucherController } from './cash-voucher.controller';
import { CashVoucherService } from './cash-voucher.service';
import { CashVoucherAccountingService } from './services/cash-voucher-accounting.service';

@Module({
  imports: [
    PrismaModule,
    CompanyCurrencyModule,
    AccessControlModule,
    AuthModule,
    AccountsPayableVoucherModule,
    AdvancesToSuppliersModule,
    PettyCashReplenishmentModule,
    RevolvingFundReplenishmentModule,
    TablePreferencesModule,
    TransactionNumberSequencesModule,
  ],
  controllers: [CashVoucherController],
  providers: [CashVoucherService, CashVoucherAccountingService],
  exports: [CashVoucherService, CashVoucherAccountingService],
})
export class CashVoucherModule {}
