import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { DiscountMaintenanceService } from './discount-maintenance.service';
import { CreateDiscountDto } from './dto/create-discount.dto';
import { GetDiscountListQueryDto } from './dto/get-discount-list-query.dto';
import { ImportDiscountsDto } from './dto/import-discounts.dto';
import { UpdateDiscountDto } from './dto/update-discount.dto';

@UseGuards(JwtAuthGuard)
@ApiTags('Discount Maintenance')
@Controller({
  path: 'maintenance/discount-maintenance',
  version: '1',
})
export class DiscountMaintenanceController {
  constructor(private readonly discountMaintenanceService: DiscountMaintenanceService) {}

  @Get()
  @ApiOkResponse({ description: 'Discount list retrieved.' })
  findAll(@CurrentUser() user: AuthUser, @Query() query: GetDiscountListQueryDto) {
    return this.discountMaintenanceService.findAll(user, query);
  }

  @Get('options')
  @ApiOkResponse({ description: 'Discount options retrieved.' })
  findOptions(@CurrentUser() user: AuthUser, @Query() query: GetDiscountListQueryDto) {
    return this.discountMaintenanceService.findOptions(user, query);
  }

  @Get(':id')
  @ApiOkResponse({ description: 'Discount retrieved.' })
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.discountMaintenanceService.findOne(user, id);
  }

  @Post()
  @ApiCreatedResponse({ description: 'Discount created.' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateDiscountDto) {
    return this.discountMaintenanceService.create(user, dto);
  }

  @Post('import')
  @ApiCreatedResponse({ description: 'Discounts imported.' })
  importDiscounts(@CurrentUser() user: AuthUser, @Body() dto: ImportDiscountsDto) {
    return this.discountMaintenanceService.importDiscounts(user, dto);
  }

  @Patch(':id')
  @ApiOkResponse({ description: 'Discount updated.' })
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateDiscountDto) {
    return this.discountMaintenanceService.update(user, id, dto);
  }
}
