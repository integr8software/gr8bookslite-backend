import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { GetWarehouseListQueryDto } from './dto/get-warehouse-list-query.dto';
import { UpdateWarehouseDto } from './dto/update-warehouse.dto';
import { WarehouseMaintenanceService } from './warehouse-maintenance.service';

@UseGuards(JwtAuthGuard)
@ApiTags('Warehouse Maintenance')
@Controller({
  path: 'maintenance/warehouse-maintenance',
  version: '1',
})
export class WarehouseMaintenanceController {
  constructor(private readonly warehouseMaintenanceService: WarehouseMaintenanceService) {}

  @Get()
  @ApiOkResponse({ description: 'Warehouse list retrieved.' })
  findAll(@CurrentUser() user: AuthUser, @Query() query: GetWarehouseListQueryDto) {
    return this.warehouseMaintenanceService.findAll(user, query);
  }

  @Get(':id')
  @ApiOkResponse({ description: 'Warehouse retrieved.' })
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.warehouseMaintenanceService.findOne(user, id);
  }

  @Post()
  @ApiCreatedResponse({ description: 'Warehouse created.' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateWarehouseDto) {
    return this.warehouseMaintenanceService.create(user, dto);
  }

  @Patch(':id')
  @ApiOkResponse({ description: 'Warehouse updated.' })
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateWarehouseDto) {
    return this.warehouseMaintenanceService.update(user, id, dto);
  }
}
