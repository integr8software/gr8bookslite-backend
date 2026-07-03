import { Module } from '@nestjs/common';
import { AccessControlService } from './access-control.service';
import { EntitlementModule } from './entitlements/entitlement.module';

@Module({
  imports: [EntitlementModule],
  providers: [AccessControlService],
  exports: [AccessControlService],
})
export class AccessControlModule {}
