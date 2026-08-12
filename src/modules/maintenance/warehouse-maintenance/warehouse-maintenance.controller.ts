import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { GetWarehouseListQueryDto } from './dto/get-warehouse-list-query.dto';
import { WarehouseLookupQueryDto } from './dto/warehouse-lookup-query.dto';
import { UpdateWarehouseDto } from './dto/update-warehouse.dto';
import { WarehouseLookupService } from './lookups/warehouse-lookup.service';
import { WarehouseMaintenanceService } from './warehouse-maintenance.service';
import { SaveWarehouseResponseDto, WarehouseContainerResponseDto, WarehouseListResponseDto, WarehouseOptionsResponseDto } from './dto/warehouse-response.dto';

@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiTags('Warehouse Maintenance')
@Controller({
  path: 'maintenance/warehouse-maintenance',
  version: '1',
})
export class WarehouseMaintenanceController {
  constructor(
    private readonly warehouseMaintenanceService: WarehouseMaintenanceService,
    private readonly warehouseLookupService: WarehouseLookupService,
  ) {}

  @Get()
  @ApiOkResponse({ type: WarehouseListResponseDto })
  findAll(@CurrentUser() user: AuthUser, @Query() query: GetWarehouseListQueryDto) {
    return this.warehouseMaintenanceService.findAll(user, query);
  }

  @Get('options')
  @ApiOkResponse({ type: WarehouseOptionsResponseDto })
  findOptions(@CurrentUser() user: AuthUser, @Query() query: WarehouseLookupQueryDto) {
    return this.warehouseLookupService.findOptionsForCompanyUser(user, query);
  }

  @Get(':id')
  @ApiOkResponse({ type: WarehouseContainerResponseDto })
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.warehouseMaintenanceService.findOne(user, id);
  }

  @Post()
  @ApiCreatedResponse({ type: SaveWarehouseResponseDto })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateWarehouseDto) {
    return this.warehouseMaintenanceService.create(user, dto);
  }

  @Patch(':id')
  @ApiOkResponse({ type: SaveWarehouseResponseDto })
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateWarehouseDto) {
    return this.warehouseMaintenanceService.update(user, id, dto);
  }
}
