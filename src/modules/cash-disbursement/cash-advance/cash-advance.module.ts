import { Module } from '@nestjs/common';
import { AccessControlModule } from '../../../common/access/access-control.module';
import { PrismaModule } from '../../../prisma/prisma.module';
import { AuthModule } from '../../auth/auth.module';
import { TablePreferencesModule } from '../../table-preferences/table-preferences.module';
import { CashAdvanceController } from './cash-advance.controller';
import { CashAdvanceService } from './cash-advance.service';
import { CashAdvanceCopySourceService } from './copy-from/cash-advance-copy-source.service';

@Module({
  imports: [PrismaModule, AccessControlModule, AuthModule, TablePreferencesModule],
  controllers: [CashAdvanceController],
  providers: [CashAdvanceService, CashAdvanceCopySourceService],
  exports: [CashAdvanceService, CashAdvanceCopySourceService],
})
export class CashAdvanceModule {}
