import { Module } from '@nestjs/common';
import { AccessControlModule } from '../../../common/access/access-control.module';
import { EntitlementModule } from '../../../common/access/entitlements/entitlement.module';
import { PrismaModule } from '../../../prisma/prisma.module';
import { AuthModule } from '../../auth/auth.module';
import { WorkspaceAuditLogsModule } from '../../workspace/audit-logs/workspace-audit-logs.module';
import { FormSignatoriesController } from './form-signatories.controller';
import { FormSignatoriesService } from './form-signatories.service';

@Module({
  imports: [
    PrismaModule,
    AccessControlModule,
    EntitlementModule,
    AuthModule,
    WorkspaceAuditLogsModule,
  ],
  controllers: [FormSignatoriesController],
  providers: [FormSignatoriesService],
})
export class FormSignatoriesModule {}
