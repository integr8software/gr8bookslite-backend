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
import { CreatePettyCashFundDto } from './dto/create-petty-cash-fund.dto';
import { GetPettyCashFundListQueryDto } from './dto/get-petty-cash-fund-list-query.dto';
import {
  PettyCashFundListResponseDto,
  PettyCashFundResponseDto,
} from './dto/petty-cash-fund-response.dto';
import { UpdatePettyCashFundDto } from './dto/update-petty-cash-fund.dto';
import { UpdatePettyCashFundStatusDto } from './dto/update-petty-cash-fund-status.dto';
import { PettyCashFundService } from './petty-cash-fund.service';
import { PettyCashFundLookupService } from './services/petty-cash-fund-lookup.service';

@ApiTags('Cash Disbursement - Petty Cash Fund')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({
  path: 'cash-disbursement/petty-cash-fund',
  version: '1',
})
export class PettyCashFundController {
  constructor(
    private readonly service: PettyCashFundService,
    private readonly lookupService: PettyCashFundLookupService,
  ) {}

  @Get('lookups/parties')
  @ApiOperation({ summary: 'Get party options for Petty Cash Fund' })
  @ApiOkResponse({ description: 'List of active party options' })
  findParties(@CurrentUser() user: AuthUser) {
    return this.lookupService.findParties(user);
  }

  @Get('lookups/responsibility-centers')
  @ApiOperation({ summary: 'Get responsibility center options for Petty Cash Fund' })
  @ApiOkResponse({ description: 'List of active responsibility centers' })
  findResponsibilityCenters(@CurrentUser() user: AuthUser) {
    return this.lookupService.findResponsibilityCenters(user);
  }

  @Get('lookups/posting-accounts')
  @ApiOperation({ summary: 'Get posting chart of account options for Petty Cash Fund' })
  @ApiOkResponse({ description: 'List of active posting accounts' })
  findPostingAccounts(@CurrentUser() user: AuthUser) {
    return this.lookupService.findPostingAccounts(user);
  }

  @Get('lookups/disbursement-accounts')
  @ApiOperation({ summary: 'Get disbursement account options for Petty Cash Fund' })
  @ApiOkResponse({ description: 'List of active disbursement accounts' })
  findDisbursementAccounts(@CurrentUser() user: AuthUser) {
    return this.lookupService.findDisbursementAccounts(user);
  }

  @Get('lookups/suggest-transaction-no')
  @ApiOperation({ summary: 'Suggest next Petty Cash Fund sequence number' })
  @ApiQuery({ name: 'branchUnitId', required: false, type: Number })
  suggestTransactionNo(
    @CurrentUser() user: AuthUser,
    @Query('branchUnitId') branchUnitId?: number,
  ) {
    return this.service.suggestTransactionNumber(user, branchUnitId);
  }

  @Get()
  @ApiOperation({ summary: 'List Petty Cash Funds with pagination and filtering' })
  @ApiOkResponse({ type: PettyCashFundListResponseDto })
  findAll(
    @CurrentUser() user: AuthUser,
    @Query() query: GetPettyCashFundListQueryDto,
  ) {
    return this.service.findAll(user, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get Petty Cash Fund details by ID' })
  @ApiOkResponse({ type: PettyCashFundResponseDto })
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.findOne(user, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new Petty Cash Fund' })
  @ApiCreatedResponse({ type: PettyCashFundResponseDto })
  create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreatePettyCashFundDto,
  ) {
    return this.service.create(user, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an existing Petty Cash Fund' })
  @ApiOkResponse({ type: PettyCashFundResponseDto })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdatePettyCashFundDto,
  ) {
    return this.service.update(user, id, dto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update status of a Petty Cash Fund' })
  @ApiOkResponse({ type: PettyCashFundResponseDto })
  updateStatus(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdatePettyCashFundStatusDto,
  ) {
    return this.service.updateStatus(user, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete a Petty Cash Fund' })
  @ApiOkResponse({ description: 'Deleted successfully' })
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.remove(user, id);
  }
}
