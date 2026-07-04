import { Module } from '@nestjs/common';
import { AccessControlModule } from '../../../common/access/access-control.module';
import { PrismaModule } from '../../../prisma/prisma.module';
import { AuthModule } from '../../auth/auth.module';
import { UserSidebarModule } from '../user-sidebar/user-sidebar.module';
import { BranchUsersController } from './branch-users.controller';
import { BranchUsersService } from './branch-users.service';

@Module({
  imports: [PrismaModule, AccessControlModule, AuthModule, UserSidebarModule],
  controllers: [BranchUsersController],
  providers: [BranchUsersService],
})
export class BranchUsersModule {}
