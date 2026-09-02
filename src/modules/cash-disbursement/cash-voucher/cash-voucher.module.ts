import { Module } from '@nestjs/common';
import { AccessControlModule } from '../../../common/access/access-control.module';
import { CompanyCurrencyModule } from '../../../common/currency/company-currency.module';
import { PrismaModule } from '../../../prisma/prisma.module';
import { AuthModule } from '../../auth/auth.module';
import { TablePreferencesModule } from '../../table-preferences/table-preferences.module';
import { TransactionNumberSequencesModule } from '../../system-administration/transaction-number-sequences/transaction-number-sequences.module';
import { CashVoucherController } from './cash-voucher.controller';
import { CashVoucherService } from './cash-voucher.service';
import { CashVoucherAccountingService } from './services/cash-voucher-accounting.service';

@Module({
  imports: [PrismaModule, CompanyCurrencyModule, AccessControlModule, AuthModule, TablePreferencesModule, TransactionNumberSequencesModule],
  controllers: [CashVoucherController],
  providers: [CashVoucherService, CashVoucherAccountingService],
  exports: [CashVoucherService, CashVoucherAccountingService],
})
export class CashVoucherModule {}
