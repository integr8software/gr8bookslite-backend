import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AccountsPayableVoucherService } from './accounts-payable-voucher.service';
import {
  AccountsPayableVoucherContainerResponseDto,
  AccountsPayableVoucherListResponseDto,
  AccountsPayableVoucherNumberSuggestionResponseDto,
  AccountsPayableVoucherPartyLookupResponseDto,
  AccountsPayableVoucherPayableAccountLookupResponseDto,
  AccountsPayableVoucherResponsibilityCenterLookupResponseDto,
  AccountsPayableVoucherTermLookupResponseDto,
  SaveAccountsPayableVoucherResponseDto,
} from './dto/accounts-payable-voucher-response.dto';
import { CreateAccountsPayableVoucherDto } from './dto/create-accounts-payable-voucher.dto';
import { GetAccountsPayableVoucherListQueryDto } from './dto/get-accounts-payable-voucher-list-query.dto';
import { UpdateAccountsPayableVoucherDto } from './dto/update-accounts-payable-voucher.dto';
import { UpdateAccountsPayableVoucherStatusDto } from './dto/update-accounts-payable-voucher-status.dto';
import { AccountsPayableVoucherLookupService } from './services/accounts-payable-voucher-lookup.service';

@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiTags('Accounts Payable Voucher')
@Controller({
  path: 'accounts-payable/accounts-payable-voucher',
  version: '1',
})
export class AccountsPayableVoucherController {
  constructor(
    private readonly accountsPayableVoucherService: AccountsPayableVoucherService,
    private readonly accountsPayableVoucherLookupService: AccountsPayableVoucherLookupService,
  ) {}

  @Get()
  @ApiOkResponse({ type: AccountsPayableVoucherListResponseDto })
  findAll(@CurrentUser() user: AuthUser, @Query() query: GetAccountsPayableVoucherListQueryDto) {
    return this.accountsPayableVoucherService.findAll(user, query);
  }

  @Get('transaction-number')
  @ApiOkResponse({ type: AccountsPayableVoucherNumberSuggestionResponseDto })
  suggestTransactionNumber(@CurrentUser() user: AuthUser, @Query() query: GetAccountsPayableVoucherListQueryDto) {
    return this.accountsPayableVoucherService.suggestTransactionNumber(user, query.branchUnitId);
  }

  @Get('lookups/parties')
  @ApiOkResponse({ type: AccountsPayableVoucherPartyLookupResponseDto })
  findPartyOptions(@CurrentUser() user: AuthUser) {
    return this.accountsPayableVoucherLookupService.findParties(user);
  }

  @Get('lookups/terms')
  @ApiOkResponse({ type: AccountsPayableVoucherTermLookupResponseDto })
  findTermOptions(@CurrentUser() user: AuthUser) {
    return this.accountsPayableVoucherLookupService.findTerms(user);
  }

  @Get('lookups/responsibility-centers')
  @ApiOkResponse({ type: AccountsPayableVoucherResponsibilityCenterLookupResponseDto })
  findResponsibilityCenterOptions(@CurrentUser() user: AuthUser) {
    return this.accountsPayableVoucherLookupService.findResponsibilityCenters(user);
  }

  @Get('lookups/payable-accounts')
  @ApiOkResponse({ type: AccountsPayableVoucherPayableAccountLookupResponseDto })
  findPayableAccountOptions(@CurrentUser() user: AuthUser) {
    return this.accountsPayableVoucherLookupService.findPayableAccounts(user);
  }

  @Get(':id')
  @ApiOkResponse({ type: AccountsPayableVoucherContainerResponseDto })
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string, @Query() query: GetAccountsPayableVoucherListQueryDto) {
    return this.accountsPayableVoucherService.findOne(user, id, query.branchUnitId);
  }

  @Post()
  @ApiCreatedResponse({ type: SaveAccountsPayableVoucherResponseDto })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateAccountsPayableVoucherDto) {
    return this.accountsPayableVoucherService.create(user, dto);
  }

  @Patch(':id')
  @ApiOkResponse({ type: SaveAccountsPayableVoucherResponseDto })
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateAccountsPayableVoucherDto) {
    return this.accountsPayableVoucherService.update(user, id, dto);
  }

  @Patch(':id/status')
  @ApiOkResponse({ type: SaveAccountsPayableVoucherResponseDto })
  updateStatus(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateAccountsPayableVoucherStatusDto) {
    return this.accountsPayableVoucherService.updateStatus(user, id, dto);
  }
}
