import { Module } from '@nestjs/common';
import { AccessControlModule } from '../../../common/access/access-control.module';
import { CompanyCurrencyModule } from '../../../common/currency/company-currency.module';
import { PrismaModule } from '../../../prisma/prisma.module';
import { AuthModule } from '../../auth/auth.module';
import { TablePreferencesModule } from '../../table-preferences/table-preferences.module';
import { RevolvingFundController } from './revolving-fund.controller';
import { RevolvingFundService } from './revolving-fund.service';

@Module({
  imports: [PrismaModule, AccessControlModule, AuthModule, CompanyCurrencyModule, TablePreferencesModule],
  controllers: [RevolvingFundController],
  providers: [RevolvingFundService],
  exports: [RevolvingFundService],
})
export class RevolvingFundModule {}
