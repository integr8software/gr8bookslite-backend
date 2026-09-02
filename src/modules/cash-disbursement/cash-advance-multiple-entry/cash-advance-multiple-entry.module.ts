import { Module } from '@nestjs/common';
import { AccessControlModule } from '../../../common/access/access-control.module';
import { PrismaModule } from '../../../prisma/prisma.module';
import { AuthModule } from '../../auth/auth.module';
import { CashAdvanceMultipleEntryController } from './cash-advance-multiple-entry.controller';
import { CashAdvanceMultipleEntryService } from './cash-advance-multiple-entry.service';

@Module({
  imports: [PrismaModule, AccessControlModule, AuthModule],
  controllers: [CashAdvanceMultipleEntryController],
  providers: [CashAdvanceMultipleEntryService],
  exports: [CashAdvanceMultipleEntryService],
})
export class CashAdvanceMultipleEntryModule {}
