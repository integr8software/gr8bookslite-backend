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
import { CreatePettyCashVoucherDto } from './dto/create-petty-cash-voucher.dto';
import { GetPettyCashVoucherListQueryDto } from './dto/get-petty-cash-voucher-list-query.dto';
import {
  PettyCashVoucherListResponseDto,
  PettyCashVoucherResponseDto,
} from './dto/petty-cash-voucher-response.dto';
import { UpdatePettyCashVoucherDto } from './dto/update-petty-cash-voucher.dto';
import { UpdatePettyCashVoucherStatusDto } from './dto/update-petty-cash-voucher-status.dto';
import { PettyCashVoucherService } from './petty-cash-voucher.service';
import { PettyCashVoucherLookupService } from './services/petty-cash-voucher-lookup.service';

@ApiTags('Cash Disbursement - Petty Cash Voucher')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({
  path: 'cash-disbursement/petty-cash-voucher',
  version: '1',
})
export class PettyCashVoucherController {
  constructor(
    private readonly service: PettyCashVoucherService,
    private readonly lookupService: PettyCashVoucherLookupService,
  ) {}

  @Get('lookups/parties')
  @ApiOperation({ summary: 'Get party options for Petty Cash Voucher' })
  @ApiOkResponse({ description: 'List of active party options' })
  findParties(@CurrentUser() user: AuthUser) {
    return this.lookupService.findParties(user);
  }

  @Get('lookups/responsibility-centers')
  @ApiOperation({ summary: 'Get responsibility center options for Petty Cash Voucher' })
  @ApiOkResponse({ description: 'List of active responsibility centers' })
  findResponsibilityCenters(@CurrentUser() user: AuthUser) {
    return this.lookupService.findResponsibilityCenters(user);
  }

  @Get('lookups/posting-accounts')
  @ApiOperation({ summary: 'Get posting chart of account options for Petty Cash Voucher' })
  @ApiOkResponse({ description: 'List of active posting accounts' })
  findPostingAccounts(@CurrentUser() user: AuthUser) {
    return this.lookupService.findPostingAccounts(user);
  }

  @Get('lookups/disbursement-accounts')
  @ApiOperation({ summary: 'Get disbursement account options for Petty Cash Voucher' })
  @ApiOkResponse({ description: 'List of active disbursement accounts' })
  findDisbursementAccounts(@CurrentUser() user: AuthUser) {
    return this.lookupService.findDisbursementAccounts(user);
  }

  @Get('lookups/suggest-voucher-no')
  @ApiOperation({ summary: 'Suggest next Petty Cash Voucher sequence number' })
  @ApiQuery({ name: 'branchUnitId', required: false, type: Number })
  suggestVoucherNo(
    @CurrentUser() user: AuthUser,
    @Query('branchUnitId') branchUnitId?: number,
  ) {
    return this.service.suggestVoucherNumber(user, branchUnitId);
  }

  @Get()
  @ApiOperation({ summary: 'List Petty Cash Vouchers with pagination and filtering' })
  @ApiOkResponse({ type: PettyCashVoucherListResponseDto })
  findAll(
    @CurrentUser() user: AuthUser,
    @Query() query: GetPettyCashVoucherListQueryDto,
  ) {
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
  create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreatePettyCashVoucherDto,
  ) {
    return this.service.create(user, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an existing Petty Cash Voucher' })
  @ApiOkResponse({ type: PettyCashVoucherResponseDto })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdatePettyCashVoucherDto,
  ) {
    return this.service.update(user, id, dto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update status of a Petty Cash Voucher' })
  @ApiOkResponse({ type: PettyCashVoucherResponseDto })
  updateStatus(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdatePettyCashVoucherStatusDto,
  ) {
    return this.service.updateStatus(user, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete a Petty Cash Voucher' })
  @ApiOkResponse({ description: 'Deleted successfully' })
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.remove(user, id);
  }
}
