import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CreatePurchaseRequestDto } from './dto/create-purchase-request.dto';
import { GetPurchaseRequestListQueryDto } from './dto/get-purchase-request-list-query.dto';
import { PurchaseRequestContainerResponseDto, PurchaseRequestListResponseDto, PurchaseRequestTypesResponseDto } from './dto/purchase-request-response.dto';
import { UpdatePurchaseRequestDto } from './dto/update-purchase-request.dto';
import { UpdatePurchaseRequestStatusDto } from './dto/update-purchase-request-status.dto';
import { PurchaseRequestService } from './purchase-request.service';

@UseGuards(JwtAuthGuard)
@ApiTags('Purchase Request')
@Controller({
  path: 'purchasing/purchase-request',
  version: '1',
})
export class PurchaseRequestController {
  constructor(private readonly purchaseRequestService: PurchaseRequestService) {}

  @Get()
  @ApiOkResponse({ description: 'Purchase requests retrieved.', type: PurchaseRequestListResponseDto })
  findAll(@CurrentUser() user: AuthUser, @Query() query: GetPurchaseRequestListQueryDto) {
    return this.purchaseRequestService.findAll(user, query);
  }

  @Get('purchase-types')
  @ApiOkResponse({ description: 'Purchase request types retrieved.', type: PurchaseRequestTypesResponseDto })
  findPurchaseTypes(@CurrentUser() user: AuthUser) {
    return this.purchaseRequestService.findPurchaseTypes(user);
  }

  @Get(':id')
  @ApiOkResponse({ description: 'Purchase request retrieved.', type: PurchaseRequestContainerResponseDto })
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.purchaseRequestService.findOne(user, id);
  }

  @Post()
  @ApiCreatedResponse({ description: 'Purchase request created.', type: PurchaseRequestContainerResponseDto })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreatePurchaseRequestDto) {
    return this.purchaseRequestService.create(user, dto);
  }

  @Patch(':id')
  @ApiOkResponse({ description: 'Purchase request updated.', type: PurchaseRequestContainerResponseDto })
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdatePurchaseRequestDto) {
    return this.purchaseRequestService.update(user, id, dto);
  }

  @Patch(':id/status')
  @ApiOkResponse({ description: 'Purchase request status updated.', type: PurchaseRequestContainerResponseDto })
  updateStatus(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdatePurchaseRequestStatusDto) {
    return this.purchaseRequestService.updateStatus(user, id, dto);
  }
}
