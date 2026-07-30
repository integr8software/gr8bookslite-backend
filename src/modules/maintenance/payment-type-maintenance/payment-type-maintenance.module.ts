import { Module } from '@nestjs/common';
import { AccessControlModule } from '../../../common/access/access-control.module';
import { PrismaModule } from '../../../prisma/prisma.module';
import { AuthModule } from '../../auth/auth.module';
import { PaymentTypeLookupService } from './lookups/payment-type-lookup.service';
import { PaymentTypeMaintenanceController } from './payment-type-maintenance.controller';
import { PaymentTypeMaintenanceService } from './payment-type-maintenance.service';

@Module({
  imports: [PrismaModule, AccessControlModule, AuthModule],
  controllers: [PaymentTypeMaintenanceController],
  providers: [PaymentTypeMaintenanceService, PaymentTypeLookupService],
  exports: [PaymentTypeMaintenanceService, PaymentTypeLookupService],
})
export class PaymentTypeMaintenanceModule {}
