import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ServiceMaintenanceType } from '@prisma/client';
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
  @ApiOperation({ summary: 'Get paginated list of service records' })
  @ApiOkResponse({ type: ServiceMaintenanceListResponseDto })
  findAll(@CurrentUser() user: AuthUser, @Query() query: GetServiceMaintenanceListQueryDto) {
    return this.servicesMaintenanceService.findAll(user, query);
  }

  @Get('options')
  @ApiOperation({ summary: 'Get service options' })
  @ApiOkResponse({ type: ServiceMaintenanceOptionsResponseDto })
  findOptions(@CurrentUser() user: AuthUser, @Query() query: GetServiceMaintenanceListQueryDto) {
    return this.servicesLookupService.findOptionsForCompanyUser(user, query);
  }

  @Get('options/:type')
  @ApiOperation({ summary: 'Get service options by type' })
  @ApiOkResponse({ type: ServiceMaintenanceOptionsResponseDto })
  findOptionsByType(@CurrentUser() user: AuthUser, @Param('type') type: string, @Query() query: GetServiceMaintenanceListQueryDto) {
    const normalizedType = type.trim().toUpperCase().replace(/-/g, '_');
    const serviceType = (normalizedType === 'PURCHASE' ? ServiceMaintenanceType.PURCHASES : normalizedType) as ServiceMaintenanceType;

    if (!Object.values(ServiceMaintenanceType).includes(serviceType)) {
      throw new BadRequestException('Service option type must be purchase, purchases, or sales.');
    }

    return this.servicesLookupService.findOptionsForCompanyUser(user, {
      ...query,
      serviceType,
    });
  }

  @Get('account-options')
  @ApiOperation({ summary: 'Get service account options' })
  @ApiOkResponse({ type: ServiceMaintenanceAccountOptionsResponseDto })
  getAccountOptions(@CurrentUser() user: AuthUser) {
    return this.servicesLookupService.findAccountOptionsForCompanyUser(user);
  }

  @Get('next-account-code')
  @ApiOperation({ summary: 'Get next service account code' })
  @ApiOkResponse({ type: ServiceMaintenanceNextAccountCodeResponseDto })
  getNextAccountCode(@CurrentUser() user: AuthUser) {
    return this.servicesMaintenanceService.getNextAccountCode(user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get service details by ID' })
  @ApiOkResponse({ type: ServiceMaintenanceContainerResponseDto })
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.servicesMaintenanceService.findOne(user, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a service record' })
  @ApiCreatedResponse({ type: SaveServiceMaintenanceResponseDto })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateServiceMaintenanceDto) {
    return this.servicesMaintenanceService.create(user, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a service record' })
  @ApiOkResponse({ type: SaveServiceMaintenanceResponseDto })
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateServiceMaintenanceDto) {
    return this.servicesMaintenanceService.update(user, id, dto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update service status' })
  @ApiOkResponse({ type: SaveServiceMaintenanceResponseDto })
  updateStatus(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateServiceMaintenanceStatusDto) {
    return this.servicesMaintenanceService.updateStatus(user, id, dto);
  }
}
