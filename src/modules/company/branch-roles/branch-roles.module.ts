import { Module } from '@nestjs/common';
import { AccessControlModule } from '../../../common/access/access-control.module';
import { PrismaModule } from '../../../prisma/prisma.module';
import { AuthModule } from '../../auth/auth.module';
import { UserSidebarModule } from '../user-sidebar/user-sidebar.module';
import { BranchRolesController } from './branch-roles.controller';
import { BranchRolesService } from './branch-roles.service';

@Module({
  imports: [PrismaModule, AccessControlModule, AuthModule, UserSidebarModule],
  controllers: [BranchRolesController],
  providers: [BranchRolesService],
})
export class BranchRolesModule {}
