import { Module } from '@nestjs/common';
import { AccessControlModule } from '../../../common/access/access-control.module';
import { CompanyCurrencyModule } from '../../../common/currency/company-currency.module';
import { PrismaModule } from '../../../prisma/prisma.module';
import { AuthModule } from '../../auth/auth.module';
import { TablePreferencesModule } from '../../table-preferences/table-preferences.module';
import { PettyCashReplenishmentController } from './petty-cash-replenishment.controller';
import { PettyCashReplenishmentService } from './petty-cash-replenishment.service';
import { PettyCashReplenishmentLookupService } from './services/petty-cash-replenishment-lookup.service';

@Module({
  imports: [PrismaModule, AccessControlModule, AuthModule, CompanyCurrencyModule, TablePreferencesModule],
  controllers: [PettyCashReplenishmentController],
  providers: [PettyCashReplenishmentService, PettyCashReplenishmentLookupService],
  exports: [PettyCashReplenishmentService, PettyCashReplenishmentLookupService],
})
export class PettyCashReplenishmentModule {}
