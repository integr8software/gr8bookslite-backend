import { Module } from '@nestjs/common';
import { AccessControlModule } from '../../../common/access/access-control.module';
import { PrismaModule } from '../../../prisma/prisma.module';
import { AuthModule } from '../../auth/auth.module';
import { WorkspaceAuditLogsController } from './workspace-audit-logs.controller';
import { WorkspaceAuditLogsService } from './workspace-audit-logs.service';

@Module({
  imports: [PrismaModule, AccessControlModule, AuthModule],
  controllers: [WorkspaceAuditLogsController],
  providers: [WorkspaceAuditLogsService],
  exports: [WorkspaceAuditLogsService],
})
export class WorkspaceAuditLogsModule {}
