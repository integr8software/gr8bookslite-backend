import { Module } from '@nestjs/common';
import { AccessControlModule } from '../../../common/access/access-control.module';
import { CompanyCurrencyModule } from '../../../common/currency/company-currency.module';
import { PrismaModule } from '../../../prisma/prisma.module';
import { AuthModule } from '../../auth/auth.module';
import { ChartOfAccountsController } from './chart-of-accounts.controller';
import { ChartOfAccountsService } from './chart-of-accounts.service';
import { ChartOfAccountsLookupService } from './lookups/chart-of-accounts-lookup.service';
import { ChartAccountBankSyncService } from './services/chart-account-bank-sync.service';

@Module({
  imports: [PrismaModule, AccessControlModule, AuthModule, CompanyCurrencyModule],
  controllers: [ChartOfAccountsController],
  providers: [ChartOfAccountsService, ChartOfAccountsLookupService, ChartAccountBankSyncService],
  exports: [ChartOfAccountsService, ChartOfAccountsLookupService],
})
export class ChartOfAccountsModule {}
