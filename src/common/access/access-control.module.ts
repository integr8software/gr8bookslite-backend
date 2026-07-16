import { Module } from '@nestjs/common';
import { AccessControlService } from './access-control.service';
import { CompanyAccessResolverModule } from './company-access/company-access-resolver.module';
import { EntitlementModule } from './entitlements/entitlement.module';
import { PermissionModule } from './permissions/permission.module';
import { SidebarBuilderModule } from './sidebar/sidebar-builder.module';

@Module({
  imports: [CompanyAccessResolverModule, EntitlementModule, PermissionModule, SidebarBuilderModule],
  providers: [AccessControlService],
  exports: [AccessControlService],
})
export class AccessControlModule {}
