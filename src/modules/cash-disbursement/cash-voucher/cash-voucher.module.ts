import { Module } from '@nestjs/common';
import { AccessControlModule } from '../../../common/access/access-control.module';
import { PrismaModule } from '../../../prisma/prisma.module';
import { AuthModule } from '../../auth/auth.module';
import { TablePreferencesModule } from '../../table-preferences/table-preferences.module';
import { CashVoucherController } from './cash-voucher.controller';
import { CashVoucherService } from './cash-voucher.service';

@Module({
  imports: [PrismaModule, AccessControlModule, AuthModule, TablePreferencesModule],
  controllers: [CashVoucherController],
  providers: [CashVoucherService],
  exports: [CashVoucherService],
})
export class CashVoucherModule {}
