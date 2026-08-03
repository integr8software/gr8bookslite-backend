import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CreateServiceMaintenanceDto } from './dto/create-service-maintenance.dto';
import { GetServiceMaintenanceListQueryDto } from './dto/get-service-maintenance-list-query.dto';
import { UpdateServiceMaintenanceStatusDto } from './dto/update-service-maintenance-status.dto';
import { UpdateServiceMaintenanceDto } from './dto/update-service-maintenance.dto';
import {
  SaveServiceMaintenanceResponseDto,
  ServiceMaintenanceAccountOptionsResponseDto,
  ServiceMaintenanceContainerResponseDto,
  ServiceMaintenanceListResponseDto,
  ServiceMaintenanceNextAccountCodeResponseDto,
  ServiceMaintenanceOptionsResponseDto,
} from './dto/service-maintenance-response.dto';
import { ServicesLookupService } from './lookups/services-lookup.service';
import { ServicesMaintenanceService } from './services-maintenance.service';

@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiTags('Services Maintenance')
@Controller({
  path: 'maintenance/financial-management/services-maintenance',
  version: '1',
})
export class ServicesMaintenanceController {
  constructor(
    private readonly servicesMaintenanceService: ServicesMaintenanceService,
    private readonly servicesLookupService: ServicesLookupService,
  ) {}

  @Get()
  @ApiOkResponse({ type: ServiceMaintenanceListResponseDto })
  findAll(@CurrentUser() user: AuthUser, @Query() query: GetServiceMaintenanceListQueryDto) {
    return this.servicesMaintenanceService.findAll(user, query);
  }

  @Get('options')
  @ApiOkResponse({ type: ServiceMaintenanceOptionsResponseDto })
  findOptions(@CurrentUser() user: AuthUser, @Query() query: GetServiceMaintenanceListQueryDto) {
    return this.servicesLookupService.findOptionsForCompanyUser(user, query);
  }

  @Get('account-options')
  @ApiOkResponse({ type: ServiceMaintenanceAccountOptionsResponseDto })
  getAccountOptions(@CurrentUser() user: AuthUser) {
    return this.servicesMaintenanceService.getAccountOptions(user);
  }

  @Get('next-account-code')
  @ApiOkResponse({ type: ServiceMaintenanceNextAccountCodeResponseDto })
  getNextAccountCode(@CurrentUser() user: AuthUser) {
    return this.servicesMaintenanceService.getNextAccountCode(user);
  }

  @Get(':id')
  @ApiOkResponse({ type: ServiceMaintenanceContainerResponseDto })
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.servicesMaintenanceService.findOne(user, id);
  }

  @Post()
  @ApiCreatedResponse({ type: SaveServiceMaintenanceResponseDto })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateServiceMaintenanceDto) {
    return this.servicesMaintenanceService.create(user, dto);
  }

  @Patch(':id')
  @ApiOkResponse({ type: SaveServiceMaintenanceResponseDto })
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateServiceMaintenanceDto) {
    return this.servicesMaintenanceService.update(user, id, dto);
  }

  @Patch(':id/status')
  @ApiOkResponse({ type: SaveServiceMaintenanceResponseDto })
  updateStatus(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateServiceMaintenanceStatusDto) {
    return this.servicesMaintenanceService.updateStatus(user, id, dto);
  }
}

@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiTags('Services Maintenance')
@Controller({
  path: 'maintenance/services-maintenance',
  version: '1',
})
export class ServicesMaintenanceLookupController {
  constructor(private readonly servicesLookupService: ServicesLookupService) {}

  @Get('options')
  @ApiOkResponse({ type: ServiceMaintenanceOptionsResponseDto })
  findOptions(@CurrentUser() user: AuthUser, @Query() query: GetServiceMaintenanceListQueryDto) {
    return this.servicesLookupService.findOptionsForCompanyUser(user, query);
  }
}
