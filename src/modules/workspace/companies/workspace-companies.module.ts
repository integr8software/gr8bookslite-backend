import { Module } from '@nestjs/common';
import { AccessControlModule } from '../../../common/access/access-control.module';
import { PrismaModule } from '../../../prisma/prisma.module';
import { WorkspaceCompaniesController } from './workspace-companies.controller';
import { WorkspaceCompaniesService } from './workspace-companies.service';

@Module({
  imports: [PrismaModule, AccessControlModule],
  controllers: [WorkspaceCompaniesController],
  providers: [WorkspaceCompaniesService],
  exports: [WorkspaceCompaniesService],
})
export class WorkspaceCompaniesModule {}
