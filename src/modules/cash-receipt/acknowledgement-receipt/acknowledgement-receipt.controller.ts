import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CreateAcknowledgementReceiptDto } from './dto/create-acknowledgement-receipt.dto';
import { GetAcknowledgementReceiptListQueryDto } from './dto/get-acknowledgement-receipt-list-query.dto';
import {
  SaveAcknowledgementReceiptResponseDto,
  AcknowledgementReceiptContainerResponseDto,
  AcknowledgementReceiptListResponseDto,
  AcknowledgementReceiptNumberSuggestionResponseDto,
} from './dto/acknowledgement-receipt-response.dto';
import { UpdateAcknowledgementReceiptStatusDto } from './dto/update-acknowledgement-receipt-status.dto';
import { UpdateAcknowledgementReceiptDto } from './dto/update-acknowledgement-receipt.dto';
import { AcknowledgementReceiptService } from './acknowledgement-receipt.service';

@UseGuards(JwtAuthGuard)
@ApiTags('Acknowledgement Receipt')
@Controller({
  path: 'cash-receipt/acknowledgement-receipt',
  version: '1',
})
export class AcknowledgementReceiptController {
  constructor(private readonly acknowledgementReceiptService: AcknowledgementReceiptService) {}

  @Get()
  @ApiOperation({ summary: 'List acknowledgement receipts' })
  @ApiOkResponse({ description: 'Acknowledgement receipts retrieved.', type: AcknowledgementReceiptListResponseDto })
  findAll(@CurrentUser() user: AuthUser, @Query() query: GetAcknowledgementReceiptListQueryDto) {
    return this.acknowledgementReceiptService.findAll(user, query);
  }

  @Get('transaction-number')
  @ApiOperation({ summary: 'Suggest a acknowledgement receipt transaction number' })
  @ApiOkResponse({ description: 'Acknowledgement receipt transaction number retrieved.', type: AcknowledgementReceiptNumberSuggestionResponseDto })
  suggestTransactionNumber(@CurrentUser() user: AuthUser, @Query() query: GetAcknowledgementReceiptListQueryDto) {
    return this.acknowledgementReceiptService.suggestTransactionNumber(user, query.branchUnitId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a acknowledgement receipt' })
  @ApiOkResponse({ description: 'Acknowledgement receipt retrieved.', type: AcknowledgementReceiptContainerResponseDto })
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string, @Query() query: GetAcknowledgementReceiptListQueryDto) {
    return this.acknowledgementReceiptService.findOne(user, id, query.branchUnitId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a acknowledgement receipt' })
  @ApiCreatedResponse({ description: 'Acknowledgement receipt created.', type: SaveAcknowledgementReceiptResponseDto })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateAcknowledgementReceiptDto) {
    return this.acknowledgementReceiptService.create(user, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a acknowledgement receipt' })
  @ApiOkResponse({ description: 'Acknowledgement receipt updated.', type: SaveAcknowledgementReceiptResponseDto })
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateAcknowledgementReceiptDto) {
    return this.acknowledgementReceiptService.update(user, id, dto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update a acknowledgement receipt status' })
  @ApiOkResponse({ description: 'Acknowledgement receipt status updated.', type: SaveAcknowledgementReceiptResponseDto })
  updateStatus(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateAcknowledgementReceiptStatusDto) {
    return this.acknowledgementReceiptService.updateStatus(user, id, dto);
  }
}
