import { Module } from '@nestjs/common';
import { AccessControlModule } from '../../../common/access/access-control.module';
import { PrismaModule } from '../../../prisma/prisma.module';
import { UserSidebarController } from './user-sidebar.controller';
import { UserSidebarService } from './user-sidebar.service';

@Module({
  imports: [PrismaModule, AccessControlModule],
  controllers: [UserSidebarController],
  providers: [UserSidebarService],
  exports: [UserSidebarService],
})
export class UserSidebarModule {}
