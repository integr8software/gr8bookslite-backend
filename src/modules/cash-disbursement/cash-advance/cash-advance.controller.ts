import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { TransactionNumberSuggestionResponseDto } from '../../../common/dto/transaction-number-suggestion-response.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CashAdvanceService } from './cash-advance.service';
import { CashAdvanceCopySourceService } from './copy-from/cash-advance-copy-source.service';
import { CashAdvanceCopyFromCandidatesResponseDto } from './copy-from/dto/cash-advance-copy-from-candidate.dto';
import { GetCashAdvanceCopyFromCandidatesQueryDto } from './copy-from/dto/get-cash-advance-copy-from-candidates-query.dto';
import {
  CashAdvanceListResponseDto,
  CashAdvanceSingleResponseDto,
  CreateCashAdvanceDto,
  GetCashAdvanceListQueryDto,
  UpdateCashAdvanceDto,
  UpdateCashAdvanceStatusDto,
} from './dto/cash-advance.dto';

@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiTags('Cash Advance')
@Controller({
  path: 'cash-disbursement/cash-advance',
  version: '1',
})
export class CashAdvanceController {
  constructor(
    private readonly cashAdvanceService: CashAdvanceService,
    private readonly cashAdvanceCopySourceService: CashAdvanceCopySourceService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get paginated cash advance records' })
  @ApiOkResponse({ description: 'Cash advance list.', type: CashAdvanceListResponseDto })
  findAll(@CurrentUser() user: AuthUser, @Query() query: GetCashAdvanceListQueryDto) {
    return this.cashAdvanceService.findAll(user, query);
  }

  @Get('transaction-number')
  @ApiOperation({ summary: 'Suggest a cash advance transaction number' })
  @ApiOkResponse({
    description: 'Cash advance transaction number retrieved.',
    type: TransactionNumberSuggestionResponseDto,
  })
  @ApiQuery({ name: 'branchUnitId', required: false, type: Number })
  suggestTransactionNumber(@CurrentUser() user: AuthUser, @Query('branchUnitId') branchUnitId?: string) {
    return this.cashAdvanceService.suggestTransactionNumber(user, branchUnitId);
  }

  @Get('copy-from/candidates')
  @ApiOperation({ summary: 'Get available Employee Advances for voucher Copy From' })
  @ApiOkResponse({ description: 'Available Employee Advances for Copy From.', type: CashAdvanceCopyFromCandidatesResponseDto })
  findCopyFromCandidates(@CurrentUser() user: AuthUser, @Query() query: GetCashAdvanceCopyFromCandidatesQueryDto) {
    return this.cashAdvanceCopySourceService.findCandidates(user, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one cash advance batch' })
  @ApiOkResponse({ description: 'Cash advance record.', type: CashAdvanceSingleResponseDto })
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.cashAdvanceService.findOne(user, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a cash advance batch' })
  @ApiCreatedResponse({ description: 'Cash advance created.' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateCashAdvanceDto) {
    return this.cashAdvanceService.create(user, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a draft cash advance batch' })
  @ApiOkResponse({ description: 'Cash advance updated.' })
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateCashAdvanceDto) {
    return this.cashAdvanceService.update(user, id, dto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update a cash advance batch status' })
  @ApiOkResponse({ description: 'Cash advance status updated.' })
  updateStatus(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateCashAdvanceStatusDto) {
    return this.cashAdvanceService.updateStatus(user, id, dto);
  }

  @Post(':id/submit-approval')
  @ApiOperation({ summary: 'Submit cash advance record for approval' })
  @ApiOkResponse({ description: 'Cash advance submitted for approval.' })
  submitApproval(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.cashAdvanceService.submitApproval(user, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Cancel a cash advance batch' })
  @ApiOkResponse({ description: 'Cash advance cancelled.' })
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.cashAdvanceService.remove(user, id);
  }
}
