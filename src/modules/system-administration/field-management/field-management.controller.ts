import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CreateModuleFieldDto, SaveModuleFieldsDto } from './dto/field-management.dto';
import { FieldManagementService } from './field-management.service';

@UseGuards(JwtAuthGuard)
@ApiTags('Field Management')
@Controller({
  path: 'system-administration/field-management',
  version: '1',
})
export class FieldManagementController {
  constructor(private readonly fieldManagementService: FieldManagementService) {}

  @Get()
  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  findAll() {
    return this.fieldManagementService.findAll();
  }

  @Patch('modules/:moduleId/fields')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  saveFields(@Param('moduleId', ParseIntPipe) moduleId: number, @Body() dto: SaveModuleFieldsDto) {
    return this.fieldManagementService.saveModuleFields(moduleId, dto);
  }

  @Post('modules/:moduleId/fields')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  createField(@Param('moduleId', ParseIntPipe) moduleId: number, @Body() dto: CreateModuleFieldDto) {
    return this.fieldManagementService.createModuleField(moduleId, dto);
  }
}
