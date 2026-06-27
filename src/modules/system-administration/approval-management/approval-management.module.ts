import { Module } from '@nestjs/common';
import { AccessControlModule } from '../../../common/access/access-control.module';
import { PrismaModule } from '../../../prisma/prisma.module';
import { AuthModule } from '../../auth/auth.module';
import { ApprovalManagementController } from './approval-management.controller';
import { ApprovalManagementService } from './approval-management.service';

@Module({
  imports: [PrismaModule, AccessControlModule, AuthModule],
  controllers: [ApprovalManagementController],
  providers: [ApprovalManagementService],
  exports: [ApprovalManagementService],
})
export class ApprovalManagementModule {}
