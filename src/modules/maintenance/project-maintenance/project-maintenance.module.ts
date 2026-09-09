import { Module } from '@nestjs/common';
import { AccessControlModule } from '../../../common/access/access-control.module';
import { PrismaModule } from '../../../prisma/prisma.module';
import { AuthModule } from '../../auth/auth.module';
import { ProjectMaintenanceController } from './project-maintenance.controller';
import { ProjectMaintenanceService } from './project-maintenance.service';

@Module({
  imports: [PrismaModule, AccessControlModule, AuthModule],
  controllers: [ProjectMaintenanceController],
  providers: [ProjectMaintenanceService],
  exports: [ProjectMaintenanceService],
})
export class ProjectMaintenanceModule {}
