import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CreateWarehouseAccessDto } from './dto/create-warehouse-access.dto';
import { GetWarehouseAccessDirectoryQueryDto } from './dto/get-warehouse-access-directory-query.dto';
import { GetWarehouseAccessListQueryDto } from './dto/get-warehouse-access-list-query.dto';
import { UpdateWarehouseAccessDto } from './dto/update-warehouse-access.dto';
import { WarehouseAccessService } from './warehouse-access.service';

@UseGuards(JwtAuthGuard)
@ApiTags('Warehouse Access')
@Controller({
  path: 'maintenance/warehouse-access',
  version: '1',
})
export class WarehouseAccessController {
  constructor(private readonly warehouseAccessService: WarehouseAccessService) {}

  @Get()
  @ApiOkResponse({ description: 'Warehouse access list retrieved.' })
  findAll(@CurrentUser() user: AuthUser, @Query() query: GetWarehouseAccessListQueryDto) {
    return this.warehouseAccessService.findAll(user, query);
  }

  @Get('directory/users')
  @ApiOkResponse({ description: 'Warehouse access user directory retrieved.' })
  findDirectoryUsers(@CurrentUser() user: AuthUser, @Query() query: GetWarehouseAccessDirectoryQueryDto) {
    return this.warehouseAccessService.findDirectoryUsers(user, query);
  }

  @Get(':id')
  @ApiOkResponse({ description: 'Warehouse access record retrieved.' })
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.warehouseAccessService.findOne(user, id);
  }

  @Post()
  @ApiCreatedResponse({ description: 'Warehouse access granted.' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateWarehouseAccessDto) {
    return this.warehouseAccessService.create(user, dto);
  }

  @Patch(':id')
  @ApiOkResponse({ description: 'Warehouse access updated.' })
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateWarehouseAccessDto) {
    return this.warehouseAccessService.update(user, id, dto);
  }

  @Delete(':id')
  @ApiOkResponse({ description: 'Warehouse access revoked.' })
  revoke(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.warehouseAccessService.revoke(user, id);
  }
}
