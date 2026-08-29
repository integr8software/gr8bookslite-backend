import { Module } from '@nestjs/common';
import { AccessControlModule } from '../../../common/access/access-control.module';
import { CompanyCurrencyModule } from '../../../common/currency/company-currency.module';
import { PrismaModule } from '../../../prisma/prisma.module';
import { AuthModule } from '../../auth/auth.module';
import { TablePreferencesModule } from '../../table-preferences/table-preferences.module';
import { PettyCashFundController } from './petty-cash-fund.controller';
import { PettyCashFundService } from './petty-cash-fund.service';
import { PettyCashFundLookupService } from './services/petty-cash-fund-lookup.service';

@Module({
  imports: [PrismaModule, AccessControlModule, AuthModule, CompanyCurrencyModule, TablePreferencesModule],
  controllers: [PettyCashFundController],
  providers: [PettyCashFundService, PettyCashFundLookupService],
  exports: [PettyCashFundService, PettyCashFundLookupService],
})
export class PettyCashFundModule {}
