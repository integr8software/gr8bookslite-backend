import { Module } from '@nestjs/common';
import { AccessControlModule } from '../../../common/access/access-control.module';
import { PrismaModule } from '../../../prisma/prisma.module';
import { AuthModule } from '../../auth/auth.module';
import { BillingModule } from '../../billing/billing.module';
import { WorkspaceCompanyLogoStorageService } from './services/workspace-company-logo-storage.service';
import { WorkspaceCompaniesController } from './workspace-companies.controller';
import { WorkspaceCompaniesService } from './workspace-companies.service';

@Module({
  imports: [PrismaModule, AccessControlModule, AuthModule, BillingModule],
  controllers: [WorkspaceCompaniesController],
  providers: [WorkspaceCompaniesService, WorkspaceCompanyLogoStorageService],
  exports: [WorkspaceCompaniesService],
})
export class WorkspaceCompaniesModule {}
