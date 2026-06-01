import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './modules/auth/auth.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { HealthModule } from './modules/health/health.module';
import { OnboardingModule } from './modules/onboarding/onboarding.module';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './modules/users/users.module';
import { BillingModule } from './modules/billing/billing.module';
import { MasterPlanAndPackagesModule } from './modules/master/plan-and-packages/master-plan-and-packages.module';
import { WorkspaceCompaniesModule } from './modules/workspace/companies/workspace-companies.module';
import { WorkspaceUsersModule } from './modules/workspace/users/workspace-users.module';
import { AiAssistantModule } from './modules/ai-assistant/ai-assistant.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    DashboardModule,
    HealthModule,
    OnboardingModule,
    UsersModule,
    BillingModule,
    MasterPlanAndPackagesModule,
    WorkspaceCompaniesModule,
    WorkspaceUsersModule,
    AiAssistantModule,
  ],
})
export class AppModule {}
