import { Module } from '@nestjs/common';
import { AccessControlModule } from '../../../common/access/access-control.module';
import { AuthModule } from '../../auth/auth.module';
import { WarehouseStorageController } from './warehouse-storage.controller';
import { WarehouseStorageService } from './warehouse-storage.service';

@Module({
  imports: [AccessControlModule, AuthModule],
  controllers: [WarehouseStorageController],
  providers: [WarehouseStorageService],
  exports: [WarehouseStorageService],
})
export class WarehouseStorageModule {}
