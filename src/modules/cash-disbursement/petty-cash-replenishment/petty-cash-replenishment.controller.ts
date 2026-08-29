import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { CreatePettyCashReplenishmentDto } from './dto/create-petty-cash-replenishment.dto';
import { GetPettyCashReplenishmentListQueryDto } from './dto/get-petty-cash-replenishment-list-query.dto';
import {
  PettyCashReplenishmentListResponseDto,
  PettyCashReplenishmentResponseDto,
} from './dto/petty-cash-replenishment-response.dto';
import { UpdatePettyCashReplenishmentDto } from './dto/update-petty-cash-replenishment.dto';
import { UpdatePettyCashReplenishmentStatusDto } from './dto/update-petty-cash-replenishment-status.dto';
import { PettyCashReplenishmentService } from './petty-cash-replenishment.service';
import { PettyCashReplenishmentLookupService } from './services/petty-cash-replenishment-lookup.service';

@ApiTags('Cash Disbursement - Petty Cash Replenishment')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({
  path: 'cash-disbursement/petty-cash-replenishment',
  version: '1',
})
export class PettyCashReplenishmentController {
  constructor(
    private readonly service: PettyCashReplenishmentService,
    private readonly lookupService: PettyCashReplenishmentLookupService,
  ) {}

  @Get('lookups/parties')
  @ApiOperation({ summary: 'Get party options for Petty Cash Replenishment' })
  @ApiOkResponse({ description: 'List of active party options' })
  findParties(@CurrentUser() user: AuthUser) {
    return this.lookupService.findParties(user);
  }

  @Get('lookups/responsibility-centers')
  @ApiOperation({ summary: 'Get responsibility center options for Petty Cash Replenishment' })
  @ApiOkResponse({ description: 'List of active responsibility centers' })
  findResponsibilityCenters(@CurrentUser() user: AuthUser) {
    return this.lookupService.findResponsibilityCenters(user);
  }

  @Get('lookups/posting-accounts')
  @ApiOperation({ summary: 'Get posting chart of account options for Petty Cash Replenishment' })
  @ApiOkResponse({ description: 'List of active posting accounts' })
  findPostingAccounts(@CurrentUser() user: AuthUser) {
    return this.lookupService.findPostingAccounts(user);
  }

  @Get('lookups/disbursement-accounts')
  @ApiOperation({ summary: 'Get disbursement account options for Petty Cash Replenishment' })
  @ApiOkResponse({ description: 'List of active disbursement accounts' })
  findDisbursementAccounts(@CurrentUser() user: AuthUser) {
    return this.lookupService.findDisbursementAccounts(user);
  }

  @Get('lookups/petty-cash-vouchers')
  @ApiOperation({ summary: 'Get approved Petty Cash Vouchers for replenishment detail selection' })
  @ApiOkResponse({ description: 'List of eligible petty cash vouchers' })
  findPettyCashVouchers(@CurrentUser() user: AuthUser) {
    return this.lookupService.findPettyCashVouchers(user);
  }

  @Get('lookups/suggest-transaction-no')
  @ApiOperation({ summary: 'Suggest next Petty Cash Replenishment sequence number' })
  @ApiQuery({ name: 'branchUnitId', required: false, type: Number })
  suggestTransactionNo(
    @CurrentUser() user: AuthUser,
    @Query('branchUnitId') branchUnitId?: number,
  ) {
    return this.service.suggestTransactionNumber(user, branchUnitId);
  }

  @Get()
  @ApiOperation({ summary: 'List Petty Cash Replenishments with pagination and filtering' })
  @ApiOkResponse({ type: PettyCashReplenishmentListResponseDto })
  findAll(
    @CurrentUser() user: AuthUser,
    @Query() query: GetPettyCashReplenishmentListQueryDto,
  ) {
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
  create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreatePettyCashReplenishmentDto,
  ) {
    return this.service.create(user, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an existing Petty Cash Replenishment' })
  @ApiOkResponse({ type: PettyCashReplenishmentResponseDto })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdatePettyCashReplenishmentDto,
  ) {
    return this.service.update(user, id, dto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update status of a Petty Cash Replenishment' })
  @ApiOkResponse({ type: PettyCashReplenishmentResponseDto })
  updateStatus(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdatePettyCashReplenishmentStatusDto,
  ) {
    return this.service.updateStatus(user, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete a Petty Cash Replenishment' })
  @ApiOkResponse({ description: 'Deleted successfully' })
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.remove(user, id);
  }
}
