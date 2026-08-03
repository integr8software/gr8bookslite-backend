import { Module } from '@nestjs/common';
import { AccessControlModule } from '../../../common/access/access-control.module';
import { PrismaModule } from '../../../prisma/prisma.module';
import { AuthModule } from '../../auth/auth.module';
import { ChartAccountBankSyncService } from '../chart-of-accounts/services/chart-account-bank-sync.service';
import { BankMasterfileController, BankMasterfileLookupController } from './bank-masterfile.controller';
import { BankMasterfileService } from './bank-masterfile.service';
import { BankMasterfileLookupService } from './lookups/bank-masterfile-lookup.service';
import { BankMasterfileSupportService } from './services/bank-masterfile-support.service';

@Module({
  imports: [PrismaModule, AccessControlModule, AuthModule],
  controllers: [BankMasterfileController, BankMasterfileLookupController],
  providers: [BankMasterfileService, BankMasterfileLookupService, BankMasterfileSupportService, ChartAccountBankSyncService],
  exports: [BankMasterfileService, BankMasterfileLookupService],
})
export class BankMasterfileModule {}
