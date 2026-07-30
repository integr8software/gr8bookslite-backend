import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CreateUnitOfMeasurementDto } from './dto/create-unit-of-measurement.dto';
import { GetUnitOfMeasurementListQueryDto } from './dto/get-unit-of-measurement-list-query.dto';
import { ImportUnitOfMeasurementsDto } from './dto/import-unit-of-measurements.dto';
import { UpdateUnitOfMeasurementDto } from './dto/update-unit-of-measurement.dto';
import { UnitOfMeasurementService } from './unit-of-measurement.service';

@UseGuards(JwtAuthGuard)
@ApiTags('Unit of Measurement')
@Controller({
  path: 'maintenance/unit-of-measurement',
  version: '1',
})
export class UnitOfMeasurementController {
  constructor(private readonly unitOfMeasurementService: UnitOfMeasurementService) {}

  @Get()
  @ApiOkResponse({ description: 'Unit of measurement list retrieved.' })
  findAll(@CurrentUser() user: AuthUser, @Query() query: GetUnitOfMeasurementListQueryDto) {
    return this.unitOfMeasurementService.findAll(user, query);
  }

  @Get('options')
  @ApiOkResponse({ description: 'Unit of measurement options retrieved.' })
  findOptions(@CurrentUser() user: AuthUser, @Query() query: GetUnitOfMeasurementListQueryDto) {
    return this.unitOfMeasurementService.findOptions(user, query);
  }

  @Get(':id')
  @ApiOkResponse({ description: 'Unit of measurement retrieved.' })
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.unitOfMeasurementService.findOne(user, id);
  }

  @Post()
  @ApiCreatedResponse({ description: 'Unit of measurement created.' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateUnitOfMeasurementDto) {
    return this.unitOfMeasurementService.create(user, dto);
  }

  @Post('import')
  @ApiCreatedResponse({ description: 'Units of measurement imported.' })
  importUnits(@CurrentUser() user: AuthUser, @Body() dto: ImportUnitOfMeasurementsDto) {
    return this.unitOfMeasurementService.importUnits(user, dto);
  }

  @Patch(':id')
  @ApiOkResponse({ description: 'Unit of measurement updated.' })
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateUnitOfMeasurementDto) {
    return this.unitOfMeasurementService.update(user, id, dto);
  }
}
