import { Module } from '@nestjs/common';
import { AccessControlModule } from '../../../common/access/access-control.module';
import { CompanyCurrencyModule } from '../../../common/currency/company-currency.module';
import { PrismaModule } from '../../../prisma/prisma.module';
import { AuthModule } from '../../auth/auth.module';
import { TablePreferencesModule } from '../../table-preferences/table-preferences.module';
import { RevolvingFundReplenishmentController } from './revolving-fund-replenishment.controller';
import { RevolvingFundReplenishmentService } from './revolving-fund-replenishment.service';
import { RevolvingFundReplenishmentCopySourceService } from './copy-from/revolving-fund-replenishment-copy-source.service';

@Module({
  imports: [PrismaModule, AccessControlModule, AuthModule, CompanyCurrencyModule, TablePreferencesModule],
  controllers: [RevolvingFundReplenishmentController],
  providers: [RevolvingFundReplenishmentService, RevolvingFundReplenishmentCopySourceService],
  exports: [RevolvingFundReplenishmentService, RevolvingFundReplenishmentCopySourceService],
})
export class RevolvingFundReplenishmentModule {}
