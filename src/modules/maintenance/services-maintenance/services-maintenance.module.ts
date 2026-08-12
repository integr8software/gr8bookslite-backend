import { Module } from '@nestjs/common';
import { AccessControlModule } from '../../../common/access/access-control.module';
import { PrismaModule } from '../../../prisma/prisma.module';
import { AuthModule } from '../../auth/auth.module';
import { ServicesLookupService } from './lookups/services-lookup.service';
import { ServicesMaintenanceController } from './services-maintenance.controller';
import { ServicesMaintenanceService } from './services-maintenance.service';

@Module({
  imports: [PrismaModule, AccessControlModule, AuthModule],
  controllers: [ServicesMaintenanceController],
  providers: [ServicesMaintenanceService, ServicesLookupService],
  exports: [ServicesMaintenanceService, ServicesLookupService],
})
export class ServicesMaintenanceModule {}
