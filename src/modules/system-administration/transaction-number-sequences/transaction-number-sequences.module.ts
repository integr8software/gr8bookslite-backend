import { Module } from '@nestjs/common';
import { AccessControlModule } from '../../../common/access/access-control.module';
import { PrismaModule } from '../../../prisma/prisma.module';
import { AuthModule } from '../../auth/auth.module';
import { TransactionNumberSequencesController } from './transaction-number-sequences.controller';
import { TransactionNumberSequencesService } from './transaction-number-sequences.service';

@Module({
  imports: [PrismaModule, AccessControlModule, AuthModule],
  controllers: [TransactionNumberSequencesController],
  providers: [TransactionNumberSequencesService],
  exports: [TransactionNumberSequencesService],
})
export class TransactionNumberSequencesModule {}
