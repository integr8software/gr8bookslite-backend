import { Module } from '@nestjs/common';
import { AccessControlModule } from '../../../common/access/access-control.module';
import { EntitlementModule } from '../../../common/access/entitlements/entitlement.module';
import { PrismaModule } from '../../../prisma/prisma.module';
import { UserSidebarController } from './user-sidebar.controller';
import { UserSidebarService } from './user-sidebar.service';

@Module({
  imports: [PrismaModule, AccessControlModule, EntitlementModule],
  controllers: [UserSidebarController],
  providers: [UserSidebarService],
  exports: [UserSidebarService],
})
export class UserSidebarModule {}
