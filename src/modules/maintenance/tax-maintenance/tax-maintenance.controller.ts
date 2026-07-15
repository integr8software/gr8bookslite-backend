import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CreateTaxMaintenanceDto } from './dto/create-tax-maintenance.dto';
import { GetTaxMaintenanceListQueryDto } from './dto/get-tax-maintenance-list-query.dto';
import { UpdateTaxMaintenanceDto } from './dto/update-tax-maintenance.dto';
import { TaxMaintenanceService } from './tax-maintenance.service';

@UseGuards(JwtAuthGuard)
@ApiTags('Tax Maintenance')
@Controller({
  path: 'maintenance/tax-maintenance',
  version: '1',
})
export class TaxMaintenanceController {
  constructor(private readonly taxMaintenanceService: TaxMaintenanceService) {}

  @Get()
  @ApiOkResponse({ description: 'Tax maintenance list retrieved.' })
  findAll(
    @CurrentUser() user: AuthUser,
    @Query() query: GetTaxMaintenanceListQueryDto,
  ) {
    return this.taxMaintenanceService.findAll(user, query);
  }

  @Get(':id')
  @ApiOkResponse({ description: 'Tax maintenance record retrieved.' })
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.taxMaintenanceService.findOne(user, id);
  }

  @Post()
  @ApiCreatedResponse({ description: 'Tax maintenance record created.' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateTaxMaintenanceDto) {
    return this.taxMaintenanceService.create(user, dto);
  }

  @Patch(':id')
  @ApiOkResponse({ description: 'Tax maintenance record updated.' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateTaxMaintenanceDto,
  ) {
    return this.taxMaintenanceService.update(user, id, dto);
  }
}
