import { Body, Controller, Get, Param, ParseIntPipe, Patch, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { BranchUsersService } from './branch-users.service';
import { UpdateBranchUserRoleDto } from './dto/update-branch-user-role.dto';

@UseGuards(JwtAuthGuard)
@Controller({
  path: 'company/units/:unitId/users',
  version: '1',
})
export class BranchUsersController {
  constructor(private readonly branchUsersService: BranchUsersService) {}

  @Get()
  findAll(@CurrentUser() user: AuthUser, @Param('unitId', ParseIntPipe) unitId: number) {
    return this.branchUsersService.findAll(user, unitId);
  }

  @Get('roles')
  findAssignableRoles(@CurrentUser() user: AuthUser, @Param('unitId', ParseIntPipe) unitId: number) {
    return this.branchUsersService.findAssignableRoles(user, unitId);
  }

  @Patch(':userId/role')
  updateRole(
    @CurrentUser() user: AuthUser,
    @Param('unitId', ParseIntPipe) unitId: number,
    @Param('userId', ParseIntPipe) userId: number,
    @Body() dto: UpdateBranchUserRoleDto,
  ) {
    return this.branchUsersService.updateRole(user, unitId, userId, dto);
  }
}
