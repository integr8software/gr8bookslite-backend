import { Module } from '@nestjs/common';
import { AccessControlModule } from '../../../common/access/access-control.module';
import { CompanyCurrencyModule } from '../../../common/currency/company-currency.module';
import { PrismaModule } from '../../../prisma/prisma.module';
import { AuthModule } from '../../auth/auth.module';
import { ChartOfAccountsModule } from '../../maintenance/chart-of-accounts/chart-of-accounts.module';
import { PartyMaintenanceModule } from '../../maintenance/party-maintenance/party-maintenance.module';
import { ResponsibilityCenterModule } from '../../maintenance/responsibility-center/responsibility-center.module';
import { TransactionNumberSequencesModule } from '../../system-administration/transaction-number-sequences/transaction-number-sequences.module';
import { JournalVoucherController } from './journal-voucher.controller';
import { JournalVoucherService } from './journal-voucher.service';
import { JournalVoucherAccountingService } from './services/journal-voucher-accounting.service';
import { JournalVoucherLookupService } from './services/journal-voucher-lookup.service';

@Module({
  imports: [
    PrismaModule,
    CompanyCurrencyModule,
    AccessControlModule,
    AuthModule,
    ChartOfAccountsModule,
    PartyMaintenanceModule,
    ResponsibilityCenterModule,
    TransactionNumberSequencesModule,
  ],
  controllers: [JournalVoucherController],
  providers: [JournalVoucherService, JournalVoucherAccountingService, JournalVoucherLookupService],
})
export class JournalVoucherModule {}
