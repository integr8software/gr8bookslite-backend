import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CreateServiceMaintenanceDto } from './dto/create-service-maintenance.dto';
import { GetServiceMaintenanceListQueryDto } from './dto/get-service-maintenance-list-query.dto';
import { UpdateServiceMaintenanceStatusDto } from './dto/update-service-maintenance-status.dto';
import { UpdateServiceMaintenanceDto } from './dto/update-service-maintenance.dto';
import { ServicesMaintenanceService } from './services-maintenance.service';

@UseGuards(JwtAuthGuard)
@ApiTags('Services Maintenance')
@Controller({
  path: 'maintenance/financial-management/services-maintenance',
  version: '1',
})
export class ServicesMaintenanceController {
  constructor(private readonly servicesMaintenanceService: ServicesMaintenanceService) {}

  @Get()
  @ApiOkResponse({ description: 'Services retrieved.' })
  findAll(@CurrentUser() user: AuthUser, @Query() query: GetServiceMaintenanceListQueryDto) {
    return this.servicesMaintenanceService.findAll(user, query);
  }

  @Get('account-options')
  @ApiOkResponse({ description: 'Service revenue account options retrieved.' })
  getAccountOptions(@CurrentUser() user: AuthUser) {
    return this.servicesMaintenanceService.getAccountOptions(user);
  }

  @Get('next-account-code')
  @ApiOkResponse({ description: 'Next service revenue account code generated.' })
  getNextAccountCode(@CurrentUser() user: AuthUser) {
    return this.servicesMaintenanceService.getNextAccountCode(user);
  }

  @Get(':id')
  @ApiOkResponse({ description: 'Service retrieved.' })
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.servicesMaintenanceService.findOne(user, id);
  }

  @Post()
  @ApiCreatedResponse({ description: 'Service created.' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateServiceMaintenanceDto) {
    return this.servicesMaintenanceService.create(user, dto);
  }

  @Patch(':id')
  @ApiOkResponse({ description: 'Service updated.' })
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateServiceMaintenanceDto) {
    return this.servicesMaintenanceService.update(user, id, dto);
  }

  @Patch(':id/status')
  @ApiOkResponse({ description: 'Service status updated.' })
  updateStatus(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateServiceMaintenanceStatusDto) {
    return this.servicesMaintenanceService.updateStatus(user, id, dto);
  }
}
