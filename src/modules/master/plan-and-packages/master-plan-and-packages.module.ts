import { Module } from '@nestjs/common';
import { AccessControlModule } from '../../../common/access/access-control.module';
import { AuthModule } from '../../auth/auth.module';
import { MasterPlanAndPackagesController } from './master-plan-and-packages.controller';
import { MasterPlanAndPackagesService } from './master-plan-and-packages.service';

@Module({
  imports: [AuthModule, AccessControlModule],
  controllers: [MasterPlanAndPackagesController],
  providers: [MasterPlanAndPackagesService],
})
export class MasterPlanAndPackagesModule {}
