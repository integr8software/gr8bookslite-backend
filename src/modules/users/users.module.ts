import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Module } from '@nestjs/common';
import { AccessControlModule } from '../../common/access/access-control.module';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { StorageModule } from '../../storage/storage.module';
import { UserAvatarStorageService } from './services/user-avatar-storage.service';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [AccessControlModule, StorageModule],
  controllers: [UsersController],
  providers: [UsersService, UserAvatarStorageService, RolesGuard, PermissionsGuard, JwtAuthGuard],
  exports: [UsersService],
})
export class UsersModule {}
