import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CreateWorkspaceUserDto } from './dto/create-workspace-user.dto';
import { UpdateWorkspaceUserDto } from './dto/update-workspace-user.dto';
import { WorkspaceUsersService } from './workspace-users.service';

@UseGuards(JwtAuthGuard)
@Controller({
  path: 'workspace/users',
  version: '1',
})
export class WorkspaceUsersController {
  constructor(private readonly workspaceUsersService: WorkspaceUsersService) {}

  @Get()
  findAll(@CurrentUser() user: AuthUser) {
    return this.workspaceUsersService.findAll(user);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateWorkspaceUserDto) {
    return this.workspaceUsersService.create(user, dto);
  }

  @Post(':userId/resend-invitation')
  resendInvitation(
    @CurrentUser() user: AuthUser,
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    return this.workspaceUsersService.resendInvitation(user, userId);
  }

  @Delete(':userId/invitation')
  cancelInvitation(
    @CurrentUser() user: AuthUser,
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    return this.workspaceUsersService.cancelInvitation(user, userId);
  }

  @Patch(':userId')
  update(
    @CurrentUser() user: AuthUser,
    @Param('userId', ParseIntPipe) userId: number,
    @Body() dto: UpdateWorkspaceUserDto,
  ) {
    return this.workspaceUsersService.update(user, userId, dto);
  }
}
