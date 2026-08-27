import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CreateBillingInvoiceDto } from './dto/create-billing-invoice.dto';
import { GetBillingInvoiceListQueryDto } from './dto/get-billing-invoice-list-query.dto';
import {
  SaveSalesBillingInvoiceResponseDto,
  BillingInvoiceContainerResponseDto,
  BillingInvoiceListResponseDto,
  BillingInvoiceNumberSuggestionResponseDto,
} from './dto/billing-invoice-response.dto';
import { UpdateBillingInvoiceStatusDto } from './dto/update-billing-invoice-status.dto';
import { UpdateBillingInvoiceDto } from './dto/update-billing-invoice.dto';
import { BillingInvoiceService } from './billing-invoice.service';

@UseGuards(JwtAuthGuard)
@ApiTags('Billing Invoice')
@Controller({
  path: 'sales/billing-invoice',
  version: '1',
})
export class BillingInvoiceController {
  constructor(private readonly billingInvoiceService: BillingInvoiceService) {}

  @Get()
  @ApiOkResponse({ description: 'Billing invoices retrieved.', type: BillingInvoiceListResponseDto })
  findAll(@CurrentUser() user: AuthUser, @Query() query: GetBillingInvoiceListQueryDto) {
    return this.billingInvoiceService.findAll(user, query);
  }

  @Get('transaction-number')
  @ApiOkResponse({ description: 'Billing invoice transaction number retrieved.', type: BillingInvoiceNumberSuggestionResponseDto })
  suggestTransactionNumber(@CurrentUser() user: AuthUser, @Query() query: GetBillingInvoiceListQueryDto) {
    return this.billingInvoiceService.suggestTransactionNumber(user, query.branchUnitId);
  }

  @Get(':id')
  @ApiOkResponse({ description: 'Billing invoice retrieved.', type: BillingInvoiceContainerResponseDto })
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string, @Query() query: GetBillingInvoiceListQueryDto) {
    return this.billingInvoiceService.findOne(user, id, query.branchUnitId);
  }

  @Post()
  @ApiCreatedResponse({ description: 'Billing invoice created.', type: SaveSalesBillingInvoiceResponseDto })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateBillingInvoiceDto) {
    return this.billingInvoiceService.create(user, dto);
  }

  @Patch(':id')
  @ApiOkResponse({ description: 'Billing invoice updated.', type: SaveSalesBillingInvoiceResponseDto })
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateBillingInvoiceDto) {
    return this.billingInvoiceService.update(user, id, dto);
  }

  @Patch(':id/status')
  @ApiOkResponse({ description: 'Billing invoice status updated.', type: SaveSalesBillingInvoiceResponseDto })
  updateStatus(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateBillingInvoiceStatusDto) {
    return this.billingInvoiceService.updateStatus(user, id, dto);
  }
}
