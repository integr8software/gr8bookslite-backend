import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CashAdvanceService } from './cash-advance.service';
import { CashAdvancePartyOptionsResponseDto } from './dto/cash-advance-party-option.dto';
import { CashAdvanceListResponseDto, CashAdvanceSingleResponseDto } from './dto/cash-advance-response.dto';
import { CreateCashAdvanceDto } from './dto/create-cash-advance.dto';
import { GetCashAdvanceListQueryDto } from './dto/get-cash-advance-list-query.dto';
import { UpdateCashAdvanceDto } from './dto/update-cash-advance.dto';

@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiTags('Cash Advance')
@Controller({
  path: 'cash-disbursement/cash-advance',
  version: '1',
})
export class CashAdvanceController {
  constructor(private readonly cashAdvanceService: CashAdvanceService) {}

  @Get()
  @ApiOperation({ summary: 'Get paginated list of cash advance records' })
  @ApiOkResponse({ type: CashAdvanceListResponseDto })
  findAll(@CurrentUser() user: AuthUser, @Query() query: GetCashAdvanceListQueryDto) {
    return this.cashAdvanceService.findAll(user, query);
  }

  @Get('party-options')
  @ApiOperation({ summary: 'Get party options with Limit, Advances, and Balance calculations for Cash Advance' })
  @ApiOkResponse({ type: CashAdvancePartyOptionsResponseDto })
  getPartyOptions(@CurrentUser() user: AuthUser) {
    return this.cashAdvanceService.getPartyOptions(user);
  }

  @Get('next-transaction-no')
  @ApiOperation({ summary: 'Get auto-generated next transaction sequence number' })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        nextTransNo: { type: 'string', example: 'CA-2026-00001' },
      },
    },
  })
  getNextTransactionNo(@CurrentUser() user: AuthUser) {
    return this.cashAdvanceService.getNextTransactionNo(user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single cash advance details by ID' })
  @ApiOkResponse({ type: CashAdvanceSingleResponseDto })
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.cashAdvanceService.findOne(user, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create new cash advance record' })
  @ApiCreatedResponse({ type: CashAdvanceSingleResponseDto })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateCashAdvanceDto) {
    return this.cashAdvanceService.create(user, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update existing cash advance record' })
  @ApiOkResponse({ type: CashAdvanceSingleResponseDto })
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateCashAdvanceDto) {
    return this.cashAdvanceService.update(user, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Cancel/soft-delete cash advance record' })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Cash Advance record cancelled successfully.' },
      },
    },
  })
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.cashAdvanceService.remove(user, id);
  }

  @Post(':id/submit-approval')
  @ApiOperation({ summary: 'Submit cash advance record for approval' })
  @ApiOkResponse({ type: CashAdvanceSingleResponseDto })
  submitApproval(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.cashAdvanceService.submitApproval(user, id);
  }
}
