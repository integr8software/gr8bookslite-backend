import { Module } from '@nestjs/common';
import { AccessControlModule } from '../../../common/access/access-control.module';
import { PrismaModule } from '../../../prisma/prisma.module';
import { AuthModule } from '../../auth/auth.module';
import { BranchUsersController } from './branch-users.controller';
import { BranchUsersService } from './branch-users.service';

@Module({
  imports: [PrismaModule, AccessControlModule, AuthModule],
  controllers: [BranchUsersController],
  providers: [BranchUsersService],
})
export class BranchUsersModule {}
