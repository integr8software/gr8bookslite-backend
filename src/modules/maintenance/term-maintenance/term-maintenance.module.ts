import { Module } from '@nestjs/common';
import { AccessControlModule } from '../../../common/access/access-control.module';
import { PrismaModule } from '../../../prisma/prisma.module';
import { AuthModule } from '../../auth/auth.module';
import { TermMaintenanceController } from './term-maintenance.controller';
import { TermMaintenanceService } from './term-maintenance.service';

@Module({
  imports: [PrismaModule, AccessControlModule, AuthModule],
  controllers: [TermMaintenanceController],
  providers: [TermMaintenanceService],
  exports: [TermMaintenanceService],
})
export class TermMaintenanceModule {}
