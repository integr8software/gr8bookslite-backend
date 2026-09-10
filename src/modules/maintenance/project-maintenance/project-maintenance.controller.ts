import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CreateProjectMaintenanceDto } from './dto/create-project-maintenance.dto';
import { GetProjectMaintenanceListQueryDto } from './dto/get-project-maintenance-list-query.dto';
import {
  ProjectMaintenanceContainerResponseDto,
  ProjectMaintenanceListResponseDto,
  ProjectMaintenanceOptionsResponseDto,
  SaveProjectMaintenanceResponseDto,
} from './dto/project-maintenance-response.dto';
import { ProjectMaintenanceLookupService } from './lookups/project-maintenance-lookup.service';
import { UpdateProjectMaintenanceDto } from './dto/update-project-maintenance.dto';
import { ProjectMaintenanceService } from './project-maintenance.service';

@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiTags('Project Maintenance')
@Controller({
  path: 'maintenance/project-maintenance',
  version: '1',
})
export class ProjectMaintenanceController {
  constructor(
    private readonly projectMaintenanceService: ProjectMaintenanceService,
    private readonly projectMaintenanceLookupService: ProjectMaintenanceLookupService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get paginated list of project records' })
  @ApiOkResponse({ type: ProjectMaintenanceListResponseDto })
  findAll(@CurrentUser() user: AuthUser, @Query() query: GetProjectMaintenanceListQueryDto) {
    return this.projectMaintenanceService.findAll(user, query);
  }

  @Get('options')
  @ApiOperation({ summary: 'Get project options' })
  @ApiOkResponse({ type: ProjectMaintenanceOptionsResponseDto })
  findOptions(@CurrentUser() user: AuthUser, @Query() query: GetProjectMaintenanceListQueryDto) {
    return this.projectMaintenanceLookupService.findOptionsForCompanyUser(user, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get project details by ID' })
  @ApiOkResponse({ type: ProjectMaintenanceContainerResponseDto })
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.projectMaintenanceService.findOne(user, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a project record' })
  @ApiCreatedResponse({ type: SaveProjectMaintenanceResponseDto })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateProjectMaintenanceDto) {
    return this.projectMaintenanceService.create(user, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a project record' })
  @ApiOkResponse({ type: SaveProjectMaintenanceResponseDto })
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateProjectMaintenanceDto) {
    return this.projectMaintenanceService.update(user, id, dto);
  }
}
