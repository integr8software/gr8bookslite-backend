import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AccountsPayableVoucherService } from './accounts-payable-voucher.service';
import { CreateAccountsPayableVoucherDto } from './dto/create-accounts-payable-voucher.dto';
import { GetAccountsPayableVoucherListQueryDto } from './dto/get-accounts-payable-voucher-list-query.dto';
import { UpdateAccountsPayableVoucherDto } from './dto/update-accounts-payable-voucher.dto';
import { UpdateAccountsPayableVoucherStatusDto } from './dto/update-accounts-payable-voucher-status.dto';

@UseGuards(JwtAuthGuard)
@ApiTags('Accounts Payable Voucher')
@Controller({
  path: 'accounts-payable/accounts-payable-voucher',
  version: '1',
})
export class AccountsPayableVoucherController {
  constructor(private readonly accountsPayableVoucherService: AccountsPayableVoucherService) {}

  @Get()
  @ApiOkResponse({ description: 'Accounts payable vouchers retrieved.' })
  findAll(@CurrentUser() user: AuthUser, @Query() query: GetAccountsPayableVoucherListQueryDto) {
    return this.accountsPayableVoucherService.findAll(user, query);
  }

  @Get('number-suggestion')
  @ApiOkResponse({ description: 'Accounts payable voucher number suggestion retrieved.' })
  suggestTransactionNumber(@CurrentUser() user: AuthUser, @Query() query: GetAccountsPayableVoucherListQueryDto) {
    return this.accountsPayableVoucherService.suggestTransactionNumber(user, query.branchUnitId);
  }

  @Get(':id')
  @ApiOkResponse({ description: 'Accounts payable voucher retrieved.' })
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string, @Query() query: GetAccountsPayableVoucherListQueryDto) {
    return this.accountsPayableVoucherService.findOne(user, id, query.branchUnitId);
  }

  @Post()
  @ApiCreatedResponse({ description: 'Accounts payable voucher created.' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateAccountsPayableVoucherDto) {
    return this.accountsPayableVoucherService.create(user, dto);
  }

  @Patch(':id')
  @ApiOkResponse({ description: 'Accounts payable voucher updated.' })
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateAccountsPayableVoucherDto) {
    return this.accountsPayableVoucherService.update(user, id, dto);
  }

  @Patch(':id/status')
  @ApiOkResponse({ description: 'Accounts payable voucher status updated.' })
  updateStatus(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateAccountsPayableVoucherStatusDto) {
    return this.accountsPayableVoucherService.updateStatus(user, id, dto);
  }
}
