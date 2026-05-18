import { Module } from '@nestjs/common';
import { AccessControlModule } from '../../common/access/access-control.module';
import { AuthModule } from '../auth/auth.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [AuthModule, AccessControlModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
