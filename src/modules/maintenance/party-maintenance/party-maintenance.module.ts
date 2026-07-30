import { Module } from '@nestjs/common';
import { AccessControlModule } from '../../../common/access/access-control.module';
import { PrismaModule } from '../../../prisma/prisma.module';
import { AddressModule } from '../../address/address.module';
import { AuthModule } from '../../auth/auth.module';
import { PartyLookupService } from './lookups/party-lookup.service';
import { PartyMaintenanceController } from './party-maintenance.controller';
import { PartyMaintenanceService } from './party-maintenance.service';

@Module({
  imports: [PrismaModule, AccessControlModule, AuthModule, AddressModule],
  controllers: [PartyMaintenanceController],
  providers: [PartyMaintenanceService, PartyLookupService],
  exports: [PartyMaintenanceService, PartyLookupService],
})
export class PartyMaintenanceModule {}
