import { Module } from '@nestjs/common';
import { AccessControlModule } from '../../../common/access/access-control.module';
import { PrismaModule } from '../../../prisma/prisma.module';
import { AuthModule } from '../../auth/auth.module';
import { ResponsibilityCenterController } from './responsibility-center.controller';
import { ResponsibilityCenterService } from './responsibility-center.service';

@Module({
  imports: [PrismaModule, AccessControlModule, AuthModule],
  controllers: [ResponsibilityCenterController],
  providers: [ResponsibilityCenterService],
})
export class ResponsibilityCenterModule {}
