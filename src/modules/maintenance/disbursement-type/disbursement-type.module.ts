import { Module } from '@nestjs/common';
import { AccessControlModule } from '../../../common/access/access-control.module';
import { PrismaModule } from '../../../prisma/prisma.module';
import { AuthModule } from '../../auth/auth.module';
import { DisbursementTypeService } from './disbursement-type.service';
import { DisbursementTypeController } from './disbursement-type.controller';

@Module({
  imports: [PrismaModule, AccessControlModule, AuthModule],
  controllers: [DisbursementTypeController],
  providers: [DisbursementTypeService],
})
export class DisbursementTypeModule {}
