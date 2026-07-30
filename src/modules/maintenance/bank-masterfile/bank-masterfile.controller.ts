import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { BankMasterfileService } from './bank-masterfile.service';
import { CreateBankAccountDto } from './dto/create-bank-account.dto';
import { GetBankAccountListQueryDto } from './dto/get-bank-account-list-query.dto';
import { ImportBankAccountsDto } from './dto/import-bank-accounts.dto';
import { UpdateBankAccountStatusDto } from './dto/update-bank-account-status.dto';
import { UpdateBankAccountDto } from './dto/update-bank-account.dto';
import { BankMasterfileLookupService } from './lookups/bank-masterfile-lookup.service';

@UseGuards(JwtAuthGuard)
@ApiTags('Bank Masterfile')
@Controller({
  path: 'maintenance/financial-management/bank-masterfile',
  version: '1',
})
export class BankMasterfileController {
  constructor(
    private readonly bankMasterfileService: BankMasterfileService,
    private readonly bankMasterfileLookupService: BankMasterfileLookupService,
  ) {}

  @Get()
  @ApiOkResponse({ description: 'Bank accounts retrieved.' })
  findAll(@CurrentUser() user: AuthUser, @Query() query: GetBankAccountListQueryDto) {
    return this.bankMasterfileService.findAll(user, query);
  }

  @Get('options')
  @ApiOkResponse({ description: 'Bank account options retrieved.' })
  findOptions(@CurrentUser() user: AuthUser, @Query() query: GetBankAccountListQueryDto) {
    return this.bankMasterfileLookupService.findOptionsForCompanyUser(user, query);
  }

  @Get('next-account-code')
  @ApiOkResponse({ description: 'Next bank account code generated.' })
  getNextAccountCode(@CurrentUser() user: AuthUser) {
    return this.bankMasterfileService.getNextAccountCode(user);
  }

  @Get(':id')
  @ApiOkResponse({ description: 'Bank account retrieved.' })
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.bankMasterfileService.findOne(user, id);
  }

  @Post()
  @ApiCreatedResponse({ description: 'Bank account created.' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateBankAccountDto) {
    return this.bankMasterfileService.create(user, dto);
  }
  @Post('import')
  @ApiCreatedResponse({ description: 'Bank accounts imported.' })
  importBankAccounts(@CurrentUser() user: AuthUser, @Body() dto: ImportBankAccountsDto) {
    return this.bankMasterfileService.importBankAccounts(user, dto);
  }

  @Patch(':id')
  @ApiOkResponse({ description: 'Bank account updated.' })
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateBankAccountDto) {
    return this.bankMasterfileService.update(user, id, dto);
  }

  @Patch(':id/status')
  @ApiOkResponse({ description: 'Bank account status updated.' })
  updateStatus(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateBankAccountStatusDto) {
    return this.bankMasterfileService.updateStatus(user, id, dto);
  }
}

@UseGuards(JwtAuthGuard)
@ApiTags('Bank Masterfile')
@Controller({
  path: 'maintenance/bank-masterfile',
  version: '1',
})
export class BankMasterfileLookupController {
  constructor(private readonly bankMasterfileLookupService: BankMasterfileLookupService) {}

  @Get('options')
  @ApiOkResponse({ description: 'Bank account options retrieved.' })
  findOptions(@CurrentUser() user: AuthUser, @Query() query: GetBankAccountListQueryDto) {
    return this.bankMasterfileLookupService.findOptionsForCompanyUser(user, query);
  }
}
