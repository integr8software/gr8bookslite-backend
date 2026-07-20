import { Module } from '@nestjs/common';
import { AccessControlModule } from '../../../common/access/access-control.module';
import { PrismaModule } from '../../../prisma/prisma.module';
import { AuthModule } from '../../auth/auth.module';
import { TaxMaintenanceController } from './tax-maintenance.controller';
import { TaxMaintenanceService } from './tax-maintenance.service';

@Module({
  imports: [PrismaModule, AccessControlModule, AuthModule],
  controllers: [TaxMaintenanceController],
  providers: [TaxMaintenanceService],
  exports: [TaxMaintenanceService],
})
export class TaxMaintenanceModule {}
