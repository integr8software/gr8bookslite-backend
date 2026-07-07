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
import { CreatePaymentTypeDto } from './dto/create-payment-type.dto';
import { GetPaymentTypeListQueryDto } from './dto/get-payment-type-list-query.dto';
import { ImportPaymentTypesDto } from './dto/import-payment-types.dto';
import { UpdatePaymentTypeDto } from './dto/update-payment-type.dto';
import { PaymentTypesService } from './payment-types.service';

@UseGuards(JwtAuthGuard)
@ApiTags('Payment Types')
@Controller({
  path: 'maintenance/financial-management/payment-types',
  version: '1',
})
export class PaymentTypesController {
  constructor(private readonly paymentTypesService: PaymentTypesService) {}

  @Get()
  @ApiOkResponse({ description: 'Payment type list retrieved.' })
  findAll(
    @CurrentUser() user: AuthUser,
    @Query() query: GetPaymentTypeListQueryDto,
  ) {
    return this.paymentTypesService.findAll(user, query);
  }

  @Get(':id')
  @ApiOkResponse({ description: 'Payment type retrieved.' })
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.paymentTypesService.findOne(user, id);
  }

  @Post()
  @ApiCreatedResponse({ description: 'Payment type created.' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreatePaymentTypeDto) {
    return this.paymentTypesService.create(user, dto);
  }

  @Post('import')
  @ApiCreatedResponse({ description: 'Payment types imported.' })
  importPaymentTypes(
    @CurrentUser() user: AuthUser,
    @Body() dto: ImportPaymentTypesDto,
  ) {
    return this.paymentTypesService.importPaymentTypes(user, dto);
  }

  @Patch(':id')
  @ApiOkResponse({ description: 'Payment type updated.' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdatePaymentTypeDto,
  ) {
    return this.paymentTypesService.update(user, id, dto);
  }
}
