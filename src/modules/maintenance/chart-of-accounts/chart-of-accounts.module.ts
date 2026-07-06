import { Module } from '@nestjs/common';
import { AccessControlModule } from '../../../common/access/access-control.module';
import { PrismaModule } from '../../../prisma/prisma.module';
import { AuthModule } from '../../auth/auth.module';
import { CoaBankSyncService } from '../coa-bank-sync/coa-bank-sync.service';
import { ChartOfAccountsController } from './chart-of-accounts.controller';
import { ChartOfAccountsService } from './chart-of-accounts.service';

@Module({
  imports: [PrismaModule, AccessControlModule, AuthModule],
  controllers: [ChartOfAccountsController],
  providers: [ChartOfAccountsService, CoaBankSyncService],
})
export class ChartOfAccountsModule {}
