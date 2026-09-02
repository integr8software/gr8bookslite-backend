import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CreateCollectionReceiptDto } from './dto/create-collection-receipt.dto';
import { GetCollectionReceiptListQueryDto } from './dto/get-collection-receipt-list-query.dto';
import {
  SaveCollectionReceiptResponseDto,
  CollectionReceiptContainerResponseDto,
  CollectionReceiptListResponseDto,
  CollectionReceiptNumberSuggestionResponseDto,
} from './dto/collection-receipt-response.dto';
import { UpdateCollectionReceiptStatusDto } from './dto/update-collection-receipt-status.dto';
import { UpdateCollectionReceiptDto } from './dto/update-collection-receipt.dto';
import { CollectionReceiptService } from './collection-receipt.service';

@UseGuards(JwtAuthGuard)
@ApiTags('Collection Receipt')
@Controller({
  path: 'cash-receipt/collection-receipt',
  version: '1',
})
export class CollectionReceiptController {
  constructor(private readonly collectionReceiptService: CollectionReceiptService) {}

  @Get()
  @ApiOperation({ summary: 'List collection receipts' })
  @ApiOkResponse({ description: 'Collection receipts retrieved.', type: CollectionReceiptListResponseDto })
  findAll(@CurrentUser() user: AuthUser, @Query() query: GetCollectionReceiptListQueryDto) {
    return this.collectionReceiptService.findAll(user, query);
  }

  @Get('transaction-number')
  @ApiOperation({ summary: 'Suggest a collection receipt transaction number' })
  @ApiOkResponse({ description: 'Collection receipt transaction number retrieved.', type: CollectionReceiptNumberSuggestionResponseDto })
  suggestTransactionNumber(@CurrentUser() user: AuthUser, @Query() query: GetCollectionReceiptListQueryDto) {
    return this.collectionReceiptService.suggestTransactionNumber(user, query.branchUnitId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a collection receipt' })
  @ApiOkResponse({ description: 'Collection receipt retrieved.', type: CollectionReceiptContainerResponseDto })
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string, @Query() query: GetCollectionReceiptListQueryDto) {
    return this.collectionReceiptService.findOne(user, id, query.branchUnitId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a collection receipt' })
  @ApiCreatedResponse({ description: 'Collection receipt created.', type: SaveCollectionReceiptResponseDto })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateCollectionReceiptDto) {
    return this.collectionReceiptService.create(user, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a collection receipt' })
  @ApiOkResponse({ description: 'Collection receipt updated.', type: SaveCollectionReceiptResponseDto })
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateCollectionReceiptDto) {
    return this.collectionReceiptService.update(user, id, dto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update a collection receipt status' })
  @ApiOkResponse({ description: 'Collection receipt status updated.', type: SaveCollectionReceiptResponseDto })
  updateStatus(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateCollectionReceiptStatusDto) {
    return this.collectionReceiptService.updateStatus(user, id, dto);
  }
}
