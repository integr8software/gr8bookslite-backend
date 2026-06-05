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
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CreateWorkspaceUserDto } from './dto/create-workspace-user.dto';
import { UpdateWorkspaceUserDto } from './dto/update-workspace-user.dto';
import {
  WorkspaceUserCancelInvitationResponseDto,
  WorkspaceUserMessageResponseDto,
  WorkspaceUserResponseDto,
} from './dto/workspace-user-response.dto';
import { WorkspaceUsersService } from './workspace-users.service';

@UseGuards(JwtAuthGuard)
@ApiTags('Workspace Users')
@Controller({
  path: 'workspace/users',
  version: '1',
})
export class WorkspaceUsersController {
  constructor(private readonly workspaceUsersService: WorkspaceUsersService) {}

  @Get()
  @ApiOkResponse({ type: [WorkspaceUserResponseDto] })
  findAll(@CurrentUser() user: AuthUser) {
    return this.workspaceUsersService.findAll(user);
  }

  @Post()
  @ApiCreatedResponse({ type: WorkspaceUserResponseDto })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateWorkspaceUserDto) {
    return this.workspaceUsersService.create(user, dto);
  }

  @Post(':userId/resend-invitation')
  @ApiCreatedResponse({ type: WorkspaceUserMessageResponseDto })
  resendInvitation(
    @CurrentUser() user: AuthUser,
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    return this.workspaceUsersService.resendInvitation(user, userId);
  }

  @Delete(':userId/invitation')
  @ApiOkResponse({ type: WorkspaceUserCancelInvitationResponseDto })
  cancelInvitation(
    @CurrentUser() user: AuthUser,
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    return this.workspaceUsersService.cancelInvitation(user, userId);
  }

  @Patch(':userId')
  @ApiOkResponse({ type: WorkspaceUserResponseDto })
  update(
    @CurrentUser() user: AuthUser,
    @Param('userId', ParseIntPipe) userId: number,
    @Body() dto: UpdateWorkspaceUserDto,
  ) {
    return this.workspaceUsersService.update(user, userId, dto);
  }
}
