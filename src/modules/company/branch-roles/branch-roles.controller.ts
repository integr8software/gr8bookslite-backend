import {
  Body,
  Controller,
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
import { BranchRolesService } from './branch-roles.service';
import { CreateBranchRoleDto } from './dto/create-branch-role.dto';
import { UpdateBranchRoleStatusDto } from './dto/update-branch-role-status.dto';
import { UpdateBranchRoleDto } from './dto/update-branch-role.dto';

@UseGuards(JwtAuthGuard)
@Controller({
  path: 'company/units/:unitId/roles',
  version: '1',
})
export class BranchRolesController {
  constructor(private readonly branchRolesService: BranchRolesService) {}

  @Get()
  findAll(
    @CurrentUser() user: AuthUser,
    @Param('unitId', ParseIntPipe) unitId: number,
  ) {
    return this.branchRolesService.findAll(user, unitId);
  }

  @Get(':roleId')
  findOne(
    @CurrentUser() user: AuthUser,
    @Param('unitId', ParseIntPipe) unitId: number,
    @Param('roleId', ParseIntPipe) roleId: number,
  ) {
    return this.branchRolesService.findOne(user, unitId, roleId);
  }

  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Param('unitId', ParseIntPipe) unitId: number,
    @Body() dto: CreateBranchRoleDto,
  ) {
    return this.branchRolesService.create(user, unitId, dto);
  }

  @Patch(':roleId')
  update(
    @CurrentUser() user: AuthUser,
    @Param('unitId', ParseIntPipe) unitId: number,
    @Param('roleId', ParseIntPipe) roleId: number,
    @Body() dto: UpdateBranchRoleDto,
  ) {
    return this.branchRolesService.update(user, unitId, roleId, dto);
  }

  @Patch(':roleId/status')
  updateStatus(
    @CurrentUser() user: AuthUser,
    @Param('unitId', ParseIntPipe) unitId: number,
    @Param('roleId', ParseIntPipe) roleId: number,
    @Body() dto: UpdateBranchRoleStatusDto,
  ) {
    return this.branchRolesService.updateStatus(user, unitId, roleId, dto);
  }
}
