import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../../../common/decorators/roles.decorator';
import { AppRole } from '../../../common/enums/app-role.enum';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import {
  SaveModuleSystemModulesDto,
  SaveModuleSystemSidebarDto,
  UpdateModuleSystemStatusDto,
  UpsertModuleSystemDto,
} from './dto/module-system.dto';
import { ModuleSystemsService } from './module-systems.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AppRole.SUPER_ADMIN)
@Controller({
  path: 'master/module-systems',
  version: '1',
})
export class ModuleSystemsController {
  constructor(private readonly moduleSystemsService: ModuleSystemsService) {}

  @Get()
  listSystems() {
    return this.moduleSystemsService.listSystems();
  }

  @Get('modules')
  listAvailableModules() {
    return this.moduleSystemsService.listAvailableModules();
  }

  @Post()
  createSystem(@Body() dto: UpsertModuleSystemDto) {
    return this.moduleSystemsService.createSystem(dto);
  }

  @Get(':systemId')
  getSystem(@Param('systemId', ParseIntPipe) systemId: number) {
    return this.moduleSystemsService.getSystem(systemId);
  }

  @Patch(':systemId')
  updateSystem(
    @Param('systemId', ParseIntPipe) systemId: number,
    @Body() dto: UpsertModuleSystemDto,
  ) {
    return this.moduleSystemsService.updateSystem(systemId, dto);
  }

  @Patch(':systemId/status')
  updateStatus(
    @Param('systemId', ParseIntPipe) systemId: number,
    @Body() dto: UpdateModuleSystemStatusDto,
  ) {
    return this.moduleSystemsService.updateStatus(systemId, dto);
  }

  @Put(':systemId/modules')
  saveModules(
    @Param('systemId', ParseIntPipe) systemId: number,
    @Body() dto: SaveModuleSystemModulesDto,
  ) {
    return this.moduleSystemsService.saveModules(systemId, dto);
  }

  @Get(':systemId/sidebar')
  getSidebar(@Param('systemId', ParseIntPipe) systemId: number) {
    return this.moduleSystemsService.getSidebar(systemId);
  }

  @Put(':systemId/sidebar')
  saveSidebar(
    @Param('systemId', ParseIntPipe) systemId: number,
    @Body() dto: SaveModuleSystemSidebarDto,
  ) {
    return this.moduleSystemsService.saveSidebar(systemId, dto);
  }
}
