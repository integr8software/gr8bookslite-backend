import { Module } from '@nestjs/common';
import { AccessControlModule } from '../../../common/access/access-control.module';
import { PrismaModule } from '../../../prisma/prisma.module';
import { AuthModule } from '../../auth/auth.module';
import { UnitOfMeasurementController } from './unit-of-measurement.controller';
import { UnitOfMeasurementService } from './unit-of-measurement.service';

@Module({
  imports: [PrismaModule, AccessControlModule, AuthModule],
  controllers: [UnitOfMeasurementController],
  providers: [UnitOfMeasurementService],
  exports: [UnitOfMeasurementService],
})
export class UnitOfMeasurementModule {}
