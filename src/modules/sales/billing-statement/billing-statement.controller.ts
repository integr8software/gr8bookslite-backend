import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CreateBillingStatementDto } from './dto/create-billing-statement.dto';
import { GetBillingStatementListQueryDto } from './dto/get-billing-statement-list-query.dto';
import { SaveBillingStatementResponseDto, BillingStatementContainerResponseDto, BillingStatementListResponseDto, BillingStatementNumberSuggestionResponseDto } from './dto/billing-statement-response.dto';
import { UpdateBillingStatementStatusDto } from './dto/update-billing-statement-status.dto';
import { UpdateBillingStatementDto } from './dto/update-billing-statement.dto';
import { BillingStatementService } from './billing-statement.service';

@UseGuards(JwtAuthGuard)
@ApiTags('Billing Statement')
@Controller({
  path: 'sales/billing-statement',
  version: '1',
})
export class BillingStatementController {
  constructor(private readonly billingStatementService: BillingStatementService) {}

  @Get()
  @ApiOkResponse({ description: 'Billing statements retrieved.', type: BillingStatementListResponseDto })
  findAll(@CurrentUser() user: AuthUser, @Query() query: GetBillingStatementListQueryDto) {
    return this.billingStatementService.findAll(user, query);
  }

  @Get('transaction-number')
  @ApiOkResponse({ description: 'Billing statement transaction number retrieved.', type: BillingStatementNumberSuggestionResponseDto })
  suggestTransactionNumber(@CurrentUser() user: AuthUser, @Query() query: GetBillingStatementListQueryDto) {
    return this.billingStatementService.suggestTransactionNumber(user, query.branchUnitId);
  }

  @Get(':id')
  @ApiOkResponse({ description: 'Billing statement retrieved.', type: BillingStatementContainerResponseDto })
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string, @Query() query: GetBillingStatementListQueryDto) {
    return this.billingStatementService.findOne(user, id, query.branchUnitId);
  }

  @Post()
  @ApiCreatedResponse({ description: 'Billing statement created.', type: SaveBillingStatementResponseDto })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateBillingStatementDto) {
    return this.billingStatementService.create(user, dto);
  }

  @Patch(':id')
  @ApiOkResponse({ description: 'Billing statement updated.', type: SaveBillingStatementResponseDto })
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateBillingStatementDto) {
    return this.billingStatementService.update(user, id, dto);
  }

  @Patch(':id/status')
  @ApiOkResponse({ description: 'Billing statement status updated.', type: SaveBillingStatementResponseDto })
  updateStatus(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateBillingStatementStatusDto) {
    return this.billingStatementService.updateStatus(user, id, dto);
  }
}
