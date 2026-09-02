import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CreateOfficialReceiptDto } from './dto/create-official-receipt.dto';
import { GetOfficialReceiptListQueryDto } from './dto/get-official-receipt-list-query.dto';
import {
  SaveOfficialReceiptResponseDto,
  OfficialReceiptContainerResponseDto,
  OfficialReceiptListResponseDto,
  OfficialReceiptNumberSuggestionResponseDto,
} from './dto/official-receipt-response.dto';
import { UpdateOfficialReceiptStatusDto } from './dto/update-official-receipt-status.dto';
import { UpdateOfficialReceiptDto } from './dto/update-official-receipt.dto';
import { OfficialReceiptService } from './official-receipt.service';

@UseGuards(JwtAuthGuard)
@ApiTags('Official Receipt')
@Controller({
  path: 'cash-receipt/official-receipt',
  version: '1',
})
export class OfficialReceiptController {
  constructor(private readonly officialReceiptService: OfficialReceiptService) {}

  @Get()
  @ApiOperation({ summary: 'List official receipts' })
  @ApiOkResponse({ description: 'official receipts retrieved.', type: OfficialReceiptListResponseDto })
  findAll(@CurrentUser() user: AuthUser, @Query() query: GetOfficialReceiptListQueryDto) {
    return this.officialReceiptService.findAll(user, query);
  }

  @Get('transaction-number')
  @ApiOperation({ summary: 'Suggest an official receipt transaction number' })
  @ApiOkResponse({ description: 'official receipt transaction number retrieved.', type: OfficialReceiptNumberSuggestionResponseDto })
  suggestTransactionNumber(@CurrentUser() user: AuthUser, @Query() query: GetOfficialReceiptListQueryDto) {
    return this.officialReceiptService.suggestTransactionNumber(user, query.branchUnitId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an official receipt' })
  @ApiOkResponse({ description: 'official receipt retrieved.', type: OfficialReceiptContainerResponseDto })
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string, @Query() query: GetOfficialReceiptListQueryDto) {
    return this.officialReceiptService.findOne(user, id, query.branchUnitId);
  }

  @Post()
  @ApiOperation({ summary: 'Create an official receipt' })
  @ApiCreatedResponse({ description: 'official receipt created.', type: SaveOfficialReceiptResponseDto })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateOfficialReceiptDto) {
    return this.officialReceiptService.create(user, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an official receipt' })
  @ApiOkResponse({ description: 'official receipt updated.', type: SaveOfficialReceiptResponseDto })
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateOfficialReceiptDto) {
    return this.officialReceiptService.update(user, id, dto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update an official receipt status' })
  @ApiOkResponse({ description: 'official receipt status updated.', type: SaveOfficialReceiptResponseDto })
  updateStatus(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateOfficialReceiptStatusDto) {
    return this.officialReceiptService.updateStatus(user, id, dto);
  }
}
