import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { PaymentTypeClassification } from '@prisma/client';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CreatePaymentTypeDto } from './dto/create-payment-type.dto';
import { GetPaymentTypeListQueryDto } from './dto/get-payment-type-list-query.dto';
import { ImportPaymentTypesDto } from './dto/import-payment-types.dto';
import {
  ImportPaymentTypesResponseDto,
  PaymentTypeContainerResponseDto,
  PaymentTypeListResponseDto,
  PaymentTypeOptionsResponseDto,
  SavePaymentTypeResponseDto,
} from './dto/payment-type-response.dto';
import { PaymentTypeLookupQueryDto } from './dto/payment-type-lookup-query.dto';
import { UpdatePaymentTypeDto } from './dto/update-payment-type.dto';
import { PaymentTypeLookupService } from './lookups/payment-type-lookup.service';
import { PaymentTypeMaintenanceService } from './payment-type-maintenance.service';

@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiTags('Payment Type Maintenance')
@Controller({
  path: 'maintenance/payment-type-maintenance',
  version: '1',
})
export class PaymentTypeMaintenanceController {
  constructor(
    private readonly paymentTypeMaintenanceService: PaymentTypeMaintenanceService,
    private readonly paymentTypeLookupService: PaymentTypeLookupService,
  ) {}

  @Get()
  @ApiOkResponse({ type: PaymentTypeListResponseDto })
  findAll(@CurrentUser() user: AuthUser, @Query() query: GetPaymentTypeListQueryDto) {
    return this.paymentTypeMaintenanceService.findAll(user, query);
  }

  @Get('options')
  @ApiOkResponse({ type: PaymentTypeOptionsResponseDto })
  findOptions(@CurrentUser() user: AuthUser, @Query() query: PaymentTypeLookupQueryDto) {
    return this.paymentTypeLookupService.findOptionsForCompanyUser(user, query);
  }

  @Get('options/:type')
  @ApiOkResponse({ type: PaymentTypeOptionsResponseDto })
  findOptionsByType(@CurrentUser() user: AuthUser, @Param('type') type: string, @Query() query: PaymentTypeLookupQueryDto) {
    const classification = type.trim().toUpperCase().replace(/-/g, '_') as PaymentTypeClassification;

    if (!Object.values(PaymentTypeClassification).includes(classification)) {
      throw new BadRequestException('Payment Type option type must be bank-transfer, check, digital-wallet, or debit-memo.');
    }

    return this.paymentTypeLookupService.findOptionsForCompanyUser(user, {
      ...query,
      classification,
    });
  }

  @Get(':id')
  @ApiOkResponse({ type: PaymentTypeContainerResponseDto })
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.paymentTypeMaintenanceService.findOne(user, id);
  }

  @Post()
  @ApiCreatedResponse({ type: SavePaymentTypeResponseDto })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreatePaymentTypeDto) {
    return this.paymentTypeMaintenanceService.create(user, dto);
  }

  @Post('import')
  @ApiCreatedResponse({ type: ImportPaymentTypesResponseDto })
  importPaymentTypes(@CurrentUser() user: AuthUser, @Body() dto: ImportPaymentTypesDto) {
    return this.paymentTypeMaintenanceService.importPaymentTypes(user, dto);
  }

  @Patch(':id')
  @ApiOkResponse({ type: SavePaymentTypeResponseDto })
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdatePaymentTypeDto) {
    return this.paymentTypeMaintenanceService.update(user, id, dto);
  }
}
