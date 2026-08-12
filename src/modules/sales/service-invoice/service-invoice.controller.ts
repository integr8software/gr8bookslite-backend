import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CreateServiceInvoiceDto } from './dto/create-service-invoice.dto';
import { GetServiceInvoiceListQueryDto } from './dto/get-service-invoice-list-query.dto';
import { SaveServiceInvoiceResponseDto, ServiceInvoiceContainerResponseDto, ServiceInvoiceListResponseDto, ServiceInvoiceNumberSuggestionResponseDto } from './dto/service-invoice-response.dto';
import { UpdateServiceInvoiceStatusDto } from './dto/update-service-invoice-status.dto';
import { UpdateServiceInvoiceDto } from './dto/update-service-invoice.dto';
import { ServiceInvoiceService } from './service-invoice.service';

@UseGuards(JwtAuthGuard)
@ApiTags('Service Invoice')
@Controller({
  path: 'sales/service-invoice',
  version: '1',
})
export class ServiceInvoiceController {
  constructor(private readonly serviceInvoiceService: ServiceInvoiceService) {}

  @Get()
  @ApiOkResponse({ description: 'Service invoices retrieved.', type: ServiceInvoiceListResponseDto })
  findAll(@CurrentUser() user: AuthUser, @Query() query: GetServiceInvoiceListQueryDto) {
    return this.serviceInvoiceService.findAll(user, query);
  }

  @Get('transaction-number')
  @ApiOkResponse({ description: 'Service invoice transaction number retrieved.', type: ServiceInvoiceNumberSuggestionResponseDto })
  suggestTransactionNumber(@CurrentUser() user: AuthUser, @Query() query: GetServiceInvoiceListQueryDto) {
    return this.serviceInvoiceService.suggestTransactionNumber(user, query.branchUnitId);
  }

  @Get(':id')
  @ApiOkResponse({ description: 'Service invoice retrieved.', type: ServiceInvoiceContainerResponseDto })
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string, @Query() query: GetServiceInvoiceListQueryDto) {
    return this.serviceInvoiceService.findOne(user, id, query.branchUnitId);
  }

  @Post()
  @ApiCreatedResponse({ description: 'Service invoice created.', type: SaveServiceInvoiceResponseDto })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateServiceInvoiceDto) {
    return this.serviceInvoiceService.create(user, dto);
  }

  @Patch(':id')
  @ApiOkResponse({ description: 'Service invoice updated.', type: SaveServiceInvoiceResponseDto })
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateServiceInvoiceDto) {
    return this.serviceInvoiceService.update(user, id, dto);
  }

  @Patch(':id/status')
  @ApiOkResponse({ description: 'Service invoice status updated.', type: SaveServiceInvoiceResponseDto })
  updateStatus(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateServiceInvoiceStatusDto) {
    return this.serviceInvoiceService.updateStatus(user, id, dto);
  }
}
