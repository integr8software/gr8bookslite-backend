import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { TransactionNumberSuggestionResponseDto } from '../../../common/dto/transaction-number-suggestion-response.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CashAdvanceMultipleEntryService } from './cash-advance-multiple-entry.service';
import {
  CreateCashAdvanceMultipleEntryDto,
  GetCashAdvanceMultipleEntryListQueryDto,
  UpdateCashAdvanceMultipleEntryDto,
  UpdateCashAdvanceMultipleEntryStatusDto,
} from './dto/cash-advance-multiple-entry.dto';

@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiTags('Cash Advance Multiple Entry')
@Controller({
  path: 'cash-disbursement/cash-advance-multiple-entry',
  version: '1',
})
export class CashAdvanceMultipleEntryController {
  constructor(private readonly service: CashAdvanceMultipleEntryService) {}

  @Get()
  @ApiOperation({ summary: 'Get paginated cash advance multiple-entry batches' })
  @ApiOkResponse({ description: 'Cash advance multiple-entry list.' })
  findAll(@CurrentUser() user: AuthUser, @Query() query: GetCashAdvanceMultipleEntryListQueryDto) {
    return this.service.findAll(user, query);
  }

  @Get('transaction-number')
  @ApiOperation({ summary: 'Suggest a cash advance multiple-entry transaction number' })
  @ApiOkResponse({
    description: 'Cash advance multiple-entry transaction number retrieved.',
    type: TransactionNumberSuggestionResponseDto,
  })
  @ApiQuery({ name: 'branchUnitId', required: false, type: Number })
  suggestTransactionNumber(@CurrentUser() user: AuthUser, @Query('branchUnitId') branchUnitId?: string) {
    return this.service.suggestTransactionNumber(user, branchUnitId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one cash advance multiple-entry batch' })
  @ApiOkResponse({ description: 'Cash advance multiple-entry record.' })
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.findOne(user, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a cash advance multiple-entry batch' })
  @ApiCreatedResponse({ description: 'Cash advance multiple-entry created.' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateCashAdvanceMultipleEntryDto) {
    return this.service.create(user, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a draft cash advance multiple-entry batch' })
  @ApiOkResponse({ description: 'Cash advance multiple-entry updated.' })
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateCashAdvanceMultipleEntryDto) {
    return this.service.update(user, id, dto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update a cash advance multiple-entry batch status' })
  @ApiOkResponse({ description: 'Cash advance multiple-entry status updated.' })
  updateStatus(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateCashAdvanceMultipleEntryStatusDto) {
    return this.service.updateStatus(user, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Cancel a cash advance multiple-entry batch' })
  @ApiOkResponse({ description: 'Cash advance multiple-entry cancelled.' })
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.remove(user, id);
  }
}
