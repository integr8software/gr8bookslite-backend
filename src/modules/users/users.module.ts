import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Module } from '@nestjs/common';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  controllers: [UsersController],
  providers: [UsersService, RolesGuard, JwtAuthGuard],
  exports: [UsersService],
})
export class UsersModule {}
