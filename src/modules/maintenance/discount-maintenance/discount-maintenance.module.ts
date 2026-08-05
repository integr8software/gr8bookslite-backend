import { Module } from '@nestjs/common';
import { AccessControlModule } from '../../../common/access/access-control.module';
import { PrismaModule } from '../../../prisma/prisma.module';
import { AuthModule } from '../../auth/auth.module';
import { DiscountMaintenanceController } from './discount-maintenance.controller';
import { DiscountMaintenanceService } from './discount-maintenance.service';
import { DiscountLookupService } from './lookups/discount-lookup.service';

@Module({
  imports: [PrismaModule, AccessControlModule, AuthModule],
  controllers: [DiscountMaintenanceController],
  providers: [DiscountMaintenanceService, DiscountLookupService],
  exports: [DiscountMaintenanceService, DiscountLookupService],
})
export class DiscountMaintenanceModule {}
