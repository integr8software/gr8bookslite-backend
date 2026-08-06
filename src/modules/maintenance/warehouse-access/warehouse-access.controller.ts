import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CreateWarehouseAccessDto } from './dto/create-warehouse-access.dto';
import { GetWarehouseAccessDirectoryQueryDto } from './dto/get-warehouse-access-directory-query.dto';
import { GetWarehouseAccessListQueryDto } from './dto/get-warehouse-access-list-query.dto';
import { UpdateWarehouseAccessDto } from './dto/update-warehouse-access.dto';
import { WarehouseAccessLookupService } from './lookups/warehouse-access-lookup.service';
import { WarehouseAccessService } from './warehouse-access.service';
import {
  CreateWarehouseAccessResponseDto,
  SaveWarehouseAccessResponseDto,
  WarehouseAccessContainerResponseDto,
  WarehouseAccessDirectoryResponseDto,
  WarehouseAccessListResponseDto,
} from './dto/warehouse-access-response.dto';

@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiTags('Warehouse Access')
@Controller({
  path: 'maintenance/warehouse-access',
  version: '1',
})
export class WarehouseAccessController {
  constructor(
    private readonly warehouseAccessService: WarehouseAccessService,
    private readonly warehouseAccessLookupService: WarehouseAccessLookupService,
  ) {}

  @Get()
  @ApiOkResponse({ type: WarehouseAccessListResponseDto })
  findAll(@CurrentUser() user: AuthUser, @Query() query: GetWarehouseAccessListQueryDto) {
    return this.warehouseAccessService.findAll(user, query);
  }

  @Get('directory/users')
  @ApiOkResponse({ type: WarehouseAccessDirectoryResponseDto })
  findDirectoryUsers(@CurrentUser() user: AuthUser, @Query() query: GetWarehouseAccessDirectoryQueryDto) {
    return this.warehouseAccessLookupService.findDirectoryUsersForCompanyUser(user, query);
  }

  @Get(':id')
  @ApiOkResponse({ type: WarehouseAccessContainerResponseDto })
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.warehouseAccessService.findOne(user, id);
  }

  @Post()
  @ApiCreatedResponse({ type: CreateWarehouseAccessResponseDto })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateWarehouseAccessDto) {
    return this.warehouseAccessService.create(user, dto);
  }

  @Patch(':id')
  @ApiOkResponse({ type: SaveWarehouseAccessResponseDto })
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateWarehouseAccessDto) {
    return this.warehouseAccessService.update(user, id, dto);
  }

  @Delete(':id')
  @ApiOkResponse({ type: SaveWarehouseAccessResponseDto })
  revoke(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.warehouseAccessService.revoke(user, id);
  }
}
