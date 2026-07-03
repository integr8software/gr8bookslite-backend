import { Module } from '@nestjs/common';
import { EntitlementModule } from '../entitlements/entitlement.module';
import { SidebarBuilder } from './sidebar-builder.service';

@Module({
  imports: [EntitlementModule],
  providers: [SidebarBuilder],
  exports: [SidebarBuilder],
})
export class SidebarBuilderModule {}
