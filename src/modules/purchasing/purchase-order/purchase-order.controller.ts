import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { GetPurchaseOrderListQueryDto } from './dto/get-purchase-order-list-query.dto';
import { PurchaseOrderContainerResponseDto, PurchaseOrderListResponseDto } from './dto/purchase-order-response.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto';
import { PurchaseOrderService } from './purchase-order.service';

@UseGuards(JwtAuthGuard) @ApiBearerAuth() @ApiTags('Purchase Order')
@Controller({ path: 'purchasing/purchase-order', version: '1' })
export class PurchaseOrderController {
  constructor(private readonly service: PurchaseOrderService) {}
  @Get() @ApiOperation({ summary: 'List purchase orders' }) @ApiOkResponse({ type: PurchaseOrderListResponseDto })
  findAll(@CurrentUser() user: AuthUser, @Query() query: GetPurchaseOrderListQueryDto) { return this.service.findAll(user, query); }
  @Get(':id') @ApiOperation({ summary: 'Get a purchase order' }) @ApiOkResponse({ type: PurchaseOrderContainerResponseDto })
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) { return this.service.findOne(user, id); }
  @Post() @ApiOperation({ summary: 'Create a purchase order' }) @ApiCreatedResponse({ type: PurchaseOrderContainerResponseDto })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreatePurchaseOrderDto) { return this.service.create(user, dto); }
  @Patch(':id') @ApiOperation({ summary: 'Update a purchase order' }) @ApiOkResponse({ type: PurchaseOrderContainerResponseDto })
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdatePurchaseOrderDto) { return this.service.update(user, id, dto); }
  @Delete(':id') @ApiOperation({ summary: 'Delete a purchase order' }) @ApiOkResponse({ type: PurchaseOrderContainerResponseDto })
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) { return this.service.remove(user, id); }
}
