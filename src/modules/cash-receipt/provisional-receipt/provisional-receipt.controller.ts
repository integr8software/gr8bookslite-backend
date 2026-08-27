import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CreateProvisionalReceiptDto } from './dto/create-provisional-receipt.dto';
import { GetProvisionalReceiptListQueryDto } from './dto/get-provisional-receipt-list-query.dto';
import { SaveProvisionalReceiptResponseDto, ProvisionalReceiptContainerResponseDto, ProvisionalReceiptListResponseDto, ProvisionalReceiptNumberSuggestionResponseDto } from './dto/provisional-receipt-response.dto';
import { UpdateProvisionalReceiptStatusDto } from './dto/update-provisional-receipt-status.dto';
import { UpdateProvisionalReceiptDto } from './dto/update-provisional-receipt.dto';
import { ProvisionalReceiptService } from './provisional-receipt.service';

@UseGuards(JwtAuthGuard)
@ApiTags('Provisional Receipt')
@Controller({
  path: 'cash-receipt/provisional-receipt',
  version: '1',
})
export class ProvisionalReceiptController {
  constructor(private readonly provisionalReceiptService: ProvisionalReceiptService) {}

  @Get()
  @ApiOkResponse({ description: 'Provisional Receipts retrieved.', type: ProvisionalReceiptListResponseDto })
  findAll(@CurrentUser() user: AuthUser, @Query() query: GetProvisionalReceiptListQueryDto) {
    return this.provisionalReceiptService.findAll(user, query);
  }

  @Get('transaction-number')
  @ApiOkResponse({ description: 'Provisional Receipt transaction number retrieved.', type: ProvisionalReceiptNumberSuggestionResponseDto })
  suggestTransactionNumber(@CurrentUser() user: AuthUser, @Query() query: GetProvisionalReceiptListQueryDto) {
    return this.provisionalReceiptService.suggestTransactionNumber(user, query.branchUnitId);
  }

  @Get(':id')
  @ApiOkResponse({ description: 'Provisional Receipt retrieved.', type: ProvisionalReceiptContainerResponseDto })
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string, @Query() query: GetProvisionalReceiptListQueryDto) {
    return this.provisionalReceiptService.findOne(user, id, query.branchUnitId);
  }

  @Post()
  @ApiCreatedResponse({ description: 'Provisional Receipt created.', type: SaveProvisionalReceiptResponseDto })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateProvisionalReceiptDto) {
    return this.provisionalReceiptService.create(user, dto);
  }

  @Patch(':id')
  @ApiOkResponse({ description: 'Provisional Receipt updated.', type: SaveProvisionalReceiptResponseDto })
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateProvisionalReceiptDto) {
    return this.provisionalReceiptService.update(user, id, dto);
  }

  @Patch(':id/status')
  @ApiOkResponse({ description: 'Provisional Receipt status updated.', type: SaveProvisionalReceiptResponseDto })
  updateStatus(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateProvisionalReceiptStatusDto) {
    return this.provisionalReceiptService.updateStatus(user, id, dto);
  }
}
