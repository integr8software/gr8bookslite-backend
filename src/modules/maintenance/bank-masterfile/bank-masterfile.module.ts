import { Module } from '@nestjs/common';
import { AccessControlModule } from '../../../common/access/access-control.module';
import { PrismaModule } from '../../../prisma/prisma.module';
import { CoaBankSyncService } from '../coa-bank-sync/coa-bank-sync.service';
import { AuthModule } from '../../auth/auth.module';
import { BankMasterfileController } from './bank-masterfile.controller';
import { BankMasterfileService } from './bank-masterfile.service';

@Module({
  imports: [PrismaModule, AccessControlModule, AuthModule],
  controllers: [BankMasterfileController],
  providers: [BankMasterfileService, CoaBankSyncService],
})
export class BankMasterfileModule {}
