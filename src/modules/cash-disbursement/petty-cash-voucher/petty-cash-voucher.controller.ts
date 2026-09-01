import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { TransactionNumberSuggestionResponseDto } from '../../../common/dto/transaction-number-suggestion-response.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { CreatePettyCashVoucherDto } from './dto/create-petty-cash-voucher.dto';
import { GetPettyCashVoucherListQueryDto } from './dto/get-petty-cash-voucher-list-query.dto';
import { PettyCashVoucherListResponseDto, PettyCashVoucherResponseDto } from './dto/petty-cash-voucher-response.dto';
import { UpdatePettyCashVoucherDto } from './dto/update-petty-cash-voucher.dto';
import { UpdatePettyCashVoucherStatusDto } from './dto/update-petty-cash-voucher-status.dto';
import { PettyCashVoucherService } from './petty-cash-voucher.service';

@ApiTags('Petty Cash Voucher')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({
  path: 'cash-disbursement/petty-cash-voucher',
  version: '1',
})
export class PettyCashVoucherController {
  constructor(private readonly service: PettyCashVoucherService) {}

  @Get('transaction-number')
  @ApiOperation({ summary: 'Suggest a Petty Cash Voucher transaction number' })
  @ApiOkResponse({ description: 'Petty Cash Voucher transaction number retrieved.', type: TransactionNumberSuggestionResponseDto })
  @ApiQuery({ name: 'branchUnitId', required: false, type: Number })
  suggestTransactionNumber(@CurrentUser() user: AuthUser, @Query('branchUnitId') branchUnitId?: number) {
    return this.service.suggestTransactionNumber(user, branchUnitId);
  }

  @Get()
  @ApiOperation({ summary: 'List Petty Cash Vouchers with pagination and filtering' })
  @ApiOkResponse({ type: PettyCashVoucherListResponseDto })
  findAll(@CurrentUser() user: AuthUser, @Query() query: GetPettyCashVoucherListQueryDto) {
    return this.service.findAll(user, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get Petty Cash Voucher details by ID' })
  @ApiOkResponse({ type: PettyCashVoucherResponseDto })
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.findOne(user, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new Petty Cash Voucher' })
  @ApiCreatedResponse({ type: PettyCashVoucherResponseDto })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreatePettyCashVoucherDto) {
    return this.service.create(user, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an existing Petty Cash Voucher' })
  @ApiOkResponse({ type: PettyCashVoucherResponseDto })
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdatePettyCashVoucherDto) {
    return this.service.update(user, id, dto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update status of a Petty Cash Voucher' })
  @ApiOkResponse({ type: PettyCashVoucherResponseDto })
  updateStatus(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdatePettyCashVoucherStatusDto) {
    return this.service.updateStatus(user, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete a Petty Cash Voucher' })
  @ApiOkResponse({ description: 'Deleted successfully' })
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.remove(user, id);
  }
}
