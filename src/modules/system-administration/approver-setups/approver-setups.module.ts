import { Module } from '@nestjs/common';
import { AccessControlModule } from '../../../common/access/access-control.module';
import { AuthModule } from '../../auth/auth.module';
import { PrismaModule } from '../../../prisma/prisma.module';
import { ApproverSetupsController } from './approver-setups.controller';
import { ApproverSetupsService } from './approver-setups.service';

@Module({
  imports: [AccessControlModule, AuthModule, PrismaModule],
  controllers: [ApproverSetupsController],
  providers: [ApproverSetupsService],
})
export class ApproverSetupsModule {}
