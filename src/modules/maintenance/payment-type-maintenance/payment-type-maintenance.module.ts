import { Module } from '@nestjs/common';
import { AccessControlModule } from '../../../common/access/access-control.module';
import { PrismaModule } from '../../../prisma/prisma.module';
import { AuthModule } from '../../auth/auth.module';
import { PaymentTypeMaintenanceController } from './payment-type-maintenance.controller';
import { PaymentTypeMaintenanceService } from './payment-type-maintenance.service';

@Module({
  imports: [PrismaModule, AccessControlModule, AuthModule],
  controllers: [PaymentTypeMaintenanceController],
  providers: [PaymentTypeMaintenanceService],
  exports: [PaymentTypeMaintenanceService],
})
export class PaymentTypeMaintenanceModule {}
