import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CreateUnitOfMeasurementDto } from './dto/create-unit-of-measurement.dto';
import { GetUnitOfMeasurementListQueryDto } from './dto/get-unit-of-measurement-list-query.dto';
import { ImportUnitOfMeasurementsDto } from './dto/import-unit-of-measurements.dto';
import { UnitOfMeasurementLookupQueryDto } from './dto/unit-of-measurement-lookup-query.dto';
import { UpdateUnitOfMeasurementDto } from './dto/update-unit-of-measurement.dto';
import { UnitOfMeasurementService } from './unit-of-measurement.service';
import { UnitOfMeasurementLookupService } from './lookups/unit-of-measurement-lookup.service';
import {
  ImportUnitOfMeasurementsResponseDto,
  SaveUnitOfMeasurementResponseDto,
  UnitOfMeasurementContainerResponseDto,
  UnitOfMeasurementListResponseDto,
  UnitOfMeasurementOptionsResponseDto,
} from './dto/unit-of-measurement-response.dto';

@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiTags('Unit of Measurement')
@Controller({
  path: 'maintenance/unit-of-measurement',
  version: '1',
})
export class UnitOfMeasurementController {
  constructor(
    private readonly unitOfMeasurementService: UnitOfMeasurementService,
    private readonly unitOfMeasurementLookupService: UnitOfMeasurementLookupService,
  ) {}

  @Get()
  @ApiOkResponse({ type: UnitOfMeasurementListResponseDto })
  findAll(@CurrentUser() user: AuthUser, @Query() query: GetUnitOfMeasurementListQueryDto) {
    return this.unitOfMeasurementService.findAll(user, query);
  }

  @Get('options')
  @ApiOkResponse({ type: UnitOfMeasurementOptionsResponseDto })
  findOptions(@CurrentUser() user: AuthUser, @Query() query: UnitOfMeasurementLookupQueryDto) {
    return this.unitOfMeasurementLookupService.findOptionsForCompanyUser(user, query);
  }

  @Get(':id')
  @ApiOkResponse({ type: UnitOfMeasurementContainerResponseDto })
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.unitOfMeasurementService.findOne(user, id);
  }

  @Post()
  @ApiCreatedResponse({ type: SaveUnitOfMeasurementResponseDto })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateUnitOfMeasurementDto) {
    return this.unitOfMeasurementService.create(user, dto);
  }

  @Post('import')
  @ApiCreatedResponse({ type: ImportUnitOfMeasurementsResponseDto })
  importUnits(@CurrentUser() user: AuthUser, @Body() dto: ImportUnitOfMeasurementsDto) {
    return this.unitOfMeasurementService.importUnits(user, dto);
  }

  @Patch(':id')
  @ApiOkResponse({ type: SaveUnitOfMeasurementResponseDto })
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateUnitOfMeasurementDto) {
    return this.unitOfMeasurementService.update(user, id, dto);
  }
}
