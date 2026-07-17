import { Body, Controller, Get, Param, ParseIntPipe, Post, Put, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { UserSidebarService } from './user-sidebar.service';
import { SaveUserSidebarDto } from './dto/save-user-sidebar.dto';

@UseGuards(JwtAuthGuard)
@Controller({ path: 'companies/:companyId/user-sidebar', version: '1' })
export class UserSidebarController {
  constructor(private readonly userSidebar: UserSidebarService) {}

  @Get('customization')
  getCustomization(
    @CurrentUser() user: AuthUser,
    @Param('companyId', ParseIntPipe) companyId: number,
    @Query('branchUnitId', ParseIntPipe) branchUnitId: number,
    @Query('userId') userId?: string,
  ) {
    return this.userSidebar.getCustomization(user, companyId, branchUnitId, userId ? Number(userId) : user.id);
  }

  @Put('customization')
  save(
    @CurrentUser() user: AuthUser,
    @Param('companyId', ParseIntPipe) companyId: number,
    @Query('branchUnitId', ParseIntPipe) branchUnitId: number,
    @Query('userId') userId: string | undefined,
    @Body() dto: SaveUserSidebarDto,
  ) {
    return this.userSidebar.save(user, companyId, branchUnitId, userId ? Number(userId) : user.id, dto);
  }

  @Post('reset')
  reset(
    @CurrentUser() user: AuthUser,
    @Param('companyId', ParseIntPipe) companyId: number,
    @Query('branchUnitId', ParseIntPipe) branchUnitId: number,
    @Query('userId') userId?: string,
    @Query('applyScope') applyScope?: 'CURRENT_BRANCH' | 'ALL_BRANCHES',
  ) {
    return this.userSidebar.reset(user, companyId, branchUnitId, userId ? Number(userId) : user.id, applyScope);
  }
}
