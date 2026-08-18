import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CreateBillingDto } from './dto/create-billing.dto';
import { GetBillingListQueryDto } from './dto/get-billing-list-query.dto';
import { SaveBillingResponseDto, BillingContainerResponseDto, BillingListResponseDto, BillingNumberSuggestionResponseDto } from './dto/billing-response.dto';
import { UpdateBillingStatusDto } from './dto/update-billing-status.dto';
import { UpdateBillingDto } from './dto/update-billing.dto';
import { BillingService } from './billing.service';

@UseGuards(JwtAuthGuard)
@ApiTags('Billing')
@Controller({
  path: 'sales/billing',
  version: '1',
})
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get()
  @ApiOkResponse({ description: 'billings retrieved.', type: BillingListResponseDto })
  findAll(@CurrentUser() user: AuthUser, @Query() query: GetBillingListQueryDto) {
    return this.billingService.findAll(user, query);
  }

  @Get('transaction-number')
  @ApiOkResponse({ description: 'billing transaction number retrieved.', type: BillingNumberSuggestionResponseDto })
  suggestTransactionNumber(@CurrentUser() user: AuthUser, @Query() query: GetBillingListQueryDto) {
    return this.billingService.suggestTransactionNumber(user, query.branchUnitId);
  }

  @Get(':id')
  @ApiOkResponse({ description: 'billing retrieved.', type: BillingContainerResponseDto })
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string, @Query() query: GetBillingListQueryDto) {
    return this.billingService.findOne(user, id, query.branchUnitId);
  }

  @Post()
  @ApiCreatedResponse({ description: 'billing created.', type: SaveBillingResponseDto })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateBillingDto) {
    return this.billingService.create(user, dto);
  }

  @Patch(':id')
  @ApiOkResponse({ description: 'billing updated.', type: SaveBillingResponseDto })
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateBillingDto) {
    return this.billingService.update(user, id, dto);
  }

  @Patch(':id/status')
  @ApiOkResponse({ description: 'billing status updated.', type: SaveBillingResponseDto })
  updateStatus(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateBillingStatusDto) {
    return this.billingService.updateStatus(user, id, dto);
  }
}
