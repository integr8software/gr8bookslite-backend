import { Module } from '@nestjs/common';
import { AccessControlModule } from '../../../common/access/access-control.module';
import { EntitlementModule } from '../../../common/access/entitlements/entitlement.module';
import { PrismaModule } from '../../../prisma/prisma.module';
import { AuthModule } from '../../auth/auth.module';
import { BranchRolesController } from './branch-roles.controller';
import { BranchRolesService } from './branch-roles.service';

@Module({
  imports: [PrismaModule, AccessControlModule, EntitlementModule, AuthModule],
  controllers: [BranchRolesController],
  providers: [BranchRolesService],
})
export class BranchRolesModule {}
