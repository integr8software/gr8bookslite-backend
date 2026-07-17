import { Module } from '@nestjs/common';
import { AccessControlModule } from '../../../common/access/access-control.module';
import { PrismaModule } from '../../../prisma/prisma.module';
import { AuthModule } from '../../auth/auth.module';
import { WorkspaceAuditLogsModule } from '../audit-logs/workspace-audit-logs.module';
import { WorkspaceUsersController } from './workspace-users.controller';
import { WorkspaceUsersService } from './workspace-users.service';

@Module({
  imports: [PrismaModule, AccessControlModule, AuthModule, WorkspaceAuditLogsModule],
  controllers: [WorkspaceUsersController],
  providers: [WorkspaceUsersService],
  exports: [WorkspaceUsersService],
})
export class WorkspaceUsersModule {}
