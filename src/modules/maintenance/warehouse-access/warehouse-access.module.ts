import { Module } from '@nestjs/common';
import { AccessControlModule } from '../../../common/access/access-control.module';
import { PrismaModule } from '../../../prisma/prisma.module';
import { AuthModule } from '../../auth/auth.module';
import { WarehouseAccessController } from './warehouse-access.controller';
import { WarehouseAccessService } from './warehouse-access.service';

@Module({
  imports: [PrismaModule, AccessControlModule, AuthModule],
  controllers: [WarehouseAccessController],
  providers: [WarehouseAccessService],
  exports: [WarehouseAccessService],
})
export class WarehouseAccessModule {}
