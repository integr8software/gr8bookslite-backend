import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { TransactionNumberSuggestionResponseDto } from '../../../common/dto/transaction-number-suggestion-response.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { CreatePettyCashReplenishmentDto } from './dto/create-petty-cash-replenishment.dto';
import { GetPettyCashReplenishmentListQueryDto } from './dto/get-petty-cash-replenishment-list-query.dto';
import { PettyCashReplenishmentListResponseDto, PettyCashReplenishmentResponseDto } from './dto/petty-cash-replenishment-response.dto';
import { UpdatePettyCashReplenishmentDto } from './dto/update-petty-cash-replenishment.dto';
import { UpdatePettyCashReplenishmentStatusDto } from './dto/update-petty-cash-replenishment-status.dto';
import { PettyCashReplenishmentService } from './petty-cash-replenishment.service';

@ApiTags('Petty Cash Replenishment')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({
  path: 'cash-disbursement/petty-cash-replenishment',
  version: '1',
})
export class PettyCashReplenishmentController {
  constructor(private readonly service: PettyCashReplenishmentService) {}

  @Get('transaction-number')
  @ApiOperation({ summary: 'Suggest a Petty Cash Replenishment transaction number' })
  @ApiOkResponse({ description: 'Petty Cash Replenishment transaction number retrieved.', type: TransactionNumberSuggestionResponseDto })
  @ApiQuery({ name: 'branchUnitId', required: false, type: Number })
  suggestTransactionNumber(@CurrentUser() user: AuthUser, @Query('branchUnitId') branchUnitId?: number) {
    return this.service.suggestTransactionNumber(user, branchUnitId);
  }

  @Get()
  @ApiOperation({ summary: 'List Petty Cash Replenishments with pagination and filtering' })
  @ApiOkResponse({ type: PettyCashReplenishmentListResponseDto })
  findAll(@CurrentUser() user: AuthUser, @Query() query: GetPettyCashReplenishmentListQueryDto) {
    return this.service.findAll(user, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get Petty Cash Replenishment details by ID' })
  @ApiOkResponse({ type: PettyCashReplenishmentResponseDto })
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.findOne(user, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new Petty Cash Replenishment' })
  @ApiCreatedResponse({ type: PettyCashReplenishmentResponseDto })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreatePettyCashReplenishmentDto) {
    return this.service.create(user, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an existing Petty Cash Replenishment' })
  @ApiOkResponse({ type: PettyCashReplenishmentResponseDto })
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdatePettyCashReplenishmentDto) {
    return this.service.update(user, id, dto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update status of a Petty Cash Replenishment' })
  @ApiOkResponse({ type: PettyCashReplenishmentResponseDto })
  updateStatus(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdatePettyCashReplenishmentStatusDto) {
    return this.service.updateStatus(user, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete a Petty Cash Replenishment' })
  @ApiOkResponse({ description: 'Deleted successfully' })
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.remove(user, id);
  }
}
