import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CreatePaymentTypeDto } from './dto/create-payment-type.dto';
import { GetPaymentTypeListQueryDto } from './dto/get-payment-type-list-query.dto';
import { ImportPaymentTypesDto } from './dto/import-payment-types.dto';
import { UpdatePaymentTypeDto } from './dto/update-payment-type.dto';
import { PaymentTypeMaintenanceService } from './payment-type-maintenance.service';

@UseGuards(JwtAuthGuard)
@ApiTags('Payment Type Maintenance')
@Controller({
  path: 'maintenance/payment-type-maintenance',
  version: '1',
})
export class PaymentTypeMaintenanceController {
  constructor(private readonly paymentTypeMaintenanceService: PaymentTypeMaintenanceService) {}

  @Get()
  @ApiOkResponse({ description: 'Payment type list retrieved.' })
  findAll(@CurrentUser() user: AuthUser, @Query() query: GetPaymentTypeListQueryDto) {
    return this.paymentTypeMaintenanceService.findAll(user, query);
  }

  @Get('options')
  @ApiOkResponse({ description: 'Payment type options retrieved.' })
  findOptions(@CurrentUser() user: AuthUser, @Query() query: GetPaymentTypeListQueryDto) {
    return this.paymentTypeMaintenanceService.findOptions(user, query);
  }

  @Get(':id')
  @ApiOkResponse({ description: 'Payment type retrieved.' })
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.paymentTypeMaintenanceService.findOne(user, id);
  }

  @Post()
  @ApiCreatedResponse({ description: 'Payment type created.' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreatePaymentTypeDto) {
    return this.paymentTypeMaintenanceService.create(user, dto);
  }

  @Post('import')
  @ApiCreatedResponse({ description: 'Payment types imported.' })
  importPaymentTypes(@CurrentUser() user: AuthUser, @Body() dto: ImportPaymentTypesDto) {
    return this.paymentTypeMaintenanceService.importPaymentTypes(user, dto);
  }

  @Patch(':id')
  @ApiOkResponse({ description: 'Payment type updated.' })
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdatePaymentTypeDto) {
    return this.paymentTypeMaintenanceService.update(user, id, dto);
  }
}
