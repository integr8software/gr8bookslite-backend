import { Module } from '@nestjs/common';
import { AccessControlModule } from '../../../common/access/access-control.module';
import { PrismaModule } from '../../../prisma/prisma.module';
import { AddressModule } from '../../address/address.module';
import { AuthModule } from '../../auth/auth.module';
import { PartyMaintenanceController } from './party-maintenance.controller';
import { PartyMaintenanceService } from './party-maintenance.service';

@Module({
  imports: [PrismaModule, AccessControlModule, AuthModule, AddressModule],
  controllers: [PartyMaintenanceController],
  providers: [PartyMaintenanceService],
  exports: [PartyMaintenanceService],
})
export class PartyMaintenanceModule {}
