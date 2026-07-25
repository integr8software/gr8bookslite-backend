import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { ServicesMaintenanceController } from './services-maintenance.controller';
import { ServicesMaintenanceService } from './services-maintenance.service';

@Module({
  imports: [PrismaModule],
  controllers: [ServicesMaintenanceController],
  providers: [ServicesMaintenanceService],
})
export class ServicesMaintenanceModule {}
