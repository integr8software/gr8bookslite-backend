import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CreateProvisionalReceiptDto } from './dto/create-provisional-receipt.dto';
import { GetProvisionalReceiptListQueryDto } from './dto/get-provisional-receipt-list-query.dto';
import {
  SaveProvisionalReceiptResponseDto,
  ProvisionalReceiptContainerResponseDto,
  ProvisionalReceiptListResponseDto,
  ProvisionalReceiptNumberSuggestionResponseDto,
} from './dto/provisional-receipt-response.dto';
import { UpdateProvisionalReceiptStatusDto } from './dto/update-provisional-receipt-status.dto';
import { UpdateProvisionalReceiptDto } from './dto/update-provisional-receipt.dto';
import { ProvisionalReceiptService } from './provisional-receipt.service';

@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiTags('Provisional Receipt')
@Controller({
  path: 'cash-receipt/provisional-receipt',
  version: '1',
})
export class ProvisionalReceiptController {
  constructor(private readonly provisionalReceiptService: ProvisionalReceiptService) {}

  @Get()
  @ApiOperation({ summary: 'List provisional receipts' })
  @ApiOkResponse({ description: 'Provisional receipts retrieved.', type: ProvisionalReceiptListResponseDto })
  findAll(@CurrentUser() user: AuthUser, @Query() query: GetProvisionalReceiptListQueryDto) {
    return this.provisionalReceiptService.findAll(user, query);
  }

  @Get('transaction-number')
  @ApiOperation({ summary: 'Suggest a provisional receipt transaction number' })
  @ApiOkResponse({ description: 'Provisional receipt transaction number retrieved.', type: ProvisionalReceiptNumberSuggestionResponseDto })
  suggestTransactionNumber(@CurrentUser() user: AuthUser, @Query() query: GetProvisionalReceiptListQueryDto) {
    return this.provisionalReceiptService.suggestTransactionNumber(user, query.branchUnitId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a provisional receipt' })
  @ApiOkResponse({ description: 'Provisional receipt retrieved.', type: ProvisionalReceiptContainerResponseDto })
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string, @Query() query: GetProvisionalReceiptListQueryDto) {
    return this.provisionalReceiptService.findOne(user, id, query.branchUnitId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a provisional receipt' })
  @ApiCreatedResponse({ description: 'Provisional receipt created.', type: SaveProvisionalReceiptResponseDto })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateProvisionalReceiptDto) {
    return this.provisionalReceiptService.create(user, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a provisional receipt' })
  @ApiOkResponse({ description: 'Provisional receipt updated.', type: SaveProvisionalReceiptResponseDto })
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateProvisionalReceiptDto) {
    return this.provisionalReceiptService.update(user, id, dto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update a provisional receipt status' })
  @ApiOkResponse({ description: 'Provisional receipt status updated.', type: SaveProvisionalReceiptResponseDto })
  updateStatus(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateProvisionalReceiptStatusDto) {
    return this.provisionalReceiptService.updateStatus(user, id, dto);
  }
}
