import { Module } from '@nestjs/common';
import { AccessControlModule } from '../../../common/access/access-control.module';
import { PrismaModule } from '../../../prisma/prisma.module';
import { AuthModule } from '../../auth/auth.module';
import { WarehouseAccessLookupService } from './lookups/warehouse-access-lookup.service';
import { WarehouseAccessController } from './warehouse-access.controller';
import { WarehouseAccessService } from './warehouse-access.service';

@Module({
  imports: [PrismaModule, AccessControlModule, AuthModule],
  controllers: [WarehouseAccessController],
  providers: [WarehouseAccessService, WarehouseAccessLookupService],
  exports: [WarehouseAccessService, WarehouseAccessLookupService],
})
export class WarehouseAccessModule {}
