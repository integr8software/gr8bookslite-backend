import { Module } from '@nestjs/common';
import { AccessControlModule } from '../../../common/access/access-control.module';
import { PrismaModule } from '../../../prisma/prisma.module';
import { AuthModule } from '../../auth/auth.module';
import { WarehouseMaintenanceController } from './warehouse-maintenance.controller';
import { WarehouseMaintenanceService } from './warehouse-maintenance.service';

@Module({
  imports: [PrismaModule, AccessControlModule, AuthModule],
  controllers: [WarehouseMaintenanceController],
  providers: [WarehouseMaintenanceService],
  exports: [WarehouseMaintenanceService],
})
export class WarehouseMaintenanceModule {}
