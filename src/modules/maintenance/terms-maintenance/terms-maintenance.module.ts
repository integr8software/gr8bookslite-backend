import { Module } from '@nestjs/common';
import { AccessControlModule } from '../../../common/access/access-control.module';
import { PrismaModule } from '../../../prisma/prisma.module';
import { AuthModule } from '../../auth/auth.module';
import { TermsMaintenanceController } from './terms-maintenance.controller';
import { TermsMaintenanceService } from './terms-maintenance.service';

@Module({
  imports: [PrismaModule, AccessControlModule, AuthModule],
  controllers: [TermsMaintenanceController],
  providers: [TermsMaintenanceService],
  exports: [TermsMaintenanceService],
})
export class TermsMaintenanceModule {}
