import { Module } from '@nestjs/common';
import { AccessControlModule } from '../../../common/access/access-control.module';
import { CompanyCurrencyModule } from '../../../common/currency/company-currency.module';
import { PrismaModule } from '../../../prisma/prisma.module';
import { AuthModule } from '../../auth/auth.module';
import { TablePreferencesModule } from '../../table-preferences/table-preferences.module';
import { PettyCashVoucherController } from './petty-cash-voucher.controller';
import { PettyCashVoucherService } from './petty-cash-voucher.service';
import { PettyCashVoucherLookupService } from './services/petty-cash-voucher-lookup.service';

@Module({
  imports: [PrismaModule, AccessControlModule, AuthModule, CompanyCurrencyModule, TablePreferencesModule],
  controllers: [PettyCashVoucherController],
  providers: [PettyCashVoucherService, PettyCashVoucherLookupService],
  exports: [PettyCashVoucherService, PettyCashVoucherLookupService],
})
export class PettyCashVoucherModule {}
