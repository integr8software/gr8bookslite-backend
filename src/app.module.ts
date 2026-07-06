import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './modules/auth/auth.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { HealthModule } from './modules/health/health.module';
import { OnboardingModule } from './modules/onboarding/onboarding.module';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './modules/users/users.module';
import { BillingModule } from './modules/billing/billing.module';
import { ModuleSystemsModule } from './modules/master/module-systems/module-systems.module';
import { MasterPlanAndPackagesModule } from './modules/master/plan-and-packages/master-plan-and-packages.module';
import { WorkspaceCompaniesModule } from './modules/workspace/companies/workspace-companies.module';
import { WorkspaceUsersModule } from './modules/workspace/users/workspace-users.module';
import { WorkspaceAuditLogsModule } from './modules/workspace/audit-logs/workspace-audit-logs.module';
import { TablePreferencesModule } from './modules/workspace/table-preferences/table-preferences.module';
import { AiAssistantModule } from './modules/ai-assistant/ai-assistant.module';
import { AlphanumericTaxCodesModule } from './modules/alphanumeric-tax-codes/alphanumeric-tax-codes.module';
import { AddressModule } from './modules/address/address.module';
import { BranchRolesModule } from './modules/company/branch-roles/branch-roles.module';
import { BranchUsersModule } from './modules/company/branch-users/branch-users.module';
import { FormSignatoriesModule } from './modules/maintenance/form-signatories/form-signatories.module';
import { ChartOfAccountsModule } from './modules/maintenance/chart-of-accounts/chart-of-accounts.module';
import { TermsModule } from './modules/maintenance/terms/terms.module';
import { BankMasterfileModule } from './modules/maintenance/bank-masterfile/bank-masterfile.module';
import { DefaultAccountModule } from './modules/maintenance/default-account/default-account.module';
import { validateEnvironment } from './config/environment';
import { ApprovalManagementModule } from './modules/system-administration/approval-management/approval-management.module';
import { TransactionNumberSequencesModule } from './modules/system-administration/transaction-number-sequences/transaction-number-sequences.module';
import { StorageModule } from './storage/storage.module';
import { UserSidebarModule } from './modules/company/user-sidebar/user-sidebar.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnvironment,
    }),
    CacheModule.register({
      isGlobal: true,
      ttl: 60_000,
    }),
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60_000,
        limit: 300,
      },
    ]),
    PrismaModule,
    StorageModule,
    AuthModule,
    DashboardModule,
    HealthModule,
    OnboardingModule,
    UsersModule,
    BillingModule,
    AddressModule,
    AlphanumericTaxCodesModule,
    ModuleSystemsModule,
    MasterPlanAndPackagesModule,
    WorkspaceCompaniesModule,
    WorkspaceUsersModule,
    WorkspaceAuditLogsModule,
    TablePreferencesModule,
    BranchRolesModule,
    BranchUsersModule,
    FormSignatoriesModule,
    ChartOfAccountsModule,
    TermsModule,
    BankMasterfileModule,
    DefaultAccountModule,
    ApprovalManagementModule,
    TransactionNumberSequencesModule,
    UserSidebarModule,
    AiAssistantModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
