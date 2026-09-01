import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { TransactionNumberSuggestionResponseDto } from '../../../common/dto/transaction-number-suggestion-response.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CashVoucherService } from './cash-voucher.service';
import { CashVoucherListResponseDto, CashVoucherSingleResponseDto } from './dto/cash-voucher-response.dto';
import { CreateCashVoucherDto } from './dto/create-cash-voucher.dto';
import { GetCashVoucherListQueryDto } from './dto/get-cash-voucher-list-query.dto';
import { UpdateCashVoucherStatusDto } from './dto/update-cash-voucher-status.dto';
import { UpdateCashVoucherDto } from './dto/update-cash-voucher.dto';

@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiTags('Cash Voucher')
@Controller({
  path: 'cash-disbursement/cash-voucher',
  version: '1',
})
export class CashVoucherController {
  constructor(private readonly cashVoucherService: CashVoucherService) {}

  @Get()
  @ApiOperation({ summary: 'Get paginated list of cash voucher records' })
  @ApiOkResponse({ type: CashVoucherListResponseDto })
  findAll(@CurrentUser() user: AuthUser, @Query() query: GetCashVoucherListQueryDto) {
    return this.cashVoucherService.findAll(user, query);
  }

  @Get('transaction-number')
  @ApiOperation({ summary: 'Get auto-suggested transaction number sequence' })
  @ApiOkResponse({ description: 'Cash Voucher transaction number retrieved.', type: TransactionNumberSuggestionResponseDto })
  suggestTransactionNumber(@CurrentUser() user: AuthUser, @Query() query: GetCashVoucherListQueryDto) {
    return this.cashVoucherService.suggestTransactionNumber(user, query.branchUnitId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single cash voucher details by ID' })
  @ApiOkResponse({ type: CashVoucherSingleResponseDto })
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string, @Query() query: GetCashVoucherListQueryDto) {
    return this.cashVoucherService.findOne(user, id, query.branchUnitId);
  }

  @Post()
  @ApiOperation({ summary: 'Create new cash voucher record' })
  @ApiCreatedResponse({ type: CashVoucherSingleResponseDto })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateCashVoucherDto) {
    return this.cashVoucherService.create(user, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update existing cash voucher record' })
  @ApiOkResponse({ type: CashVoucherSingleResponseDto })
  updatePut(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateCashVoucherDto) {
    return this.cashVoucherService.update(user, id, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Patch existing cash voucher record' })
  @ApiOkResponse({ type: CashVoucherSingleResponseDto })
  updatePatch(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateCashVoucherDto) {
    return this.cashVoucherService.update(user, id, dto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update cash voucher status' })
  @ApiOkResponse({ type: CashVoucherSingleResponseDto })
  updateStatus(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateCashVoucherStatusDto) {
    return this.cashVoucherService.updateStatus(user, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Cancel/soft-delete cash voucher record' })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Cash Voucher record cancelled successfully.' },
      },
    },
  })
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.cashVoucherService.remove(user, id);
  }
}
