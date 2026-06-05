import { Module } from '@nestjs/common';
import { AccessControlModule } from '../../../common/access/access-control.module';
import { PrismaModule } from '../../../prisma/prisma.module';
import { AuthModule } from '../../auth/auth.module';
import { WorkspaceUsersController } from './workspace-users.controller';
import { WorkspaceUsersService } from './workspace-users.service';

@Module({
  imports: [PrismaModule, AccessControlModule, AuthModule],
  controllers: [WorkspaceUsersController],
  providers: [WorkspaceUsersService],
  exports: [WorkspaceUsersService],
})
export class WorkspaceUsersModule {}
