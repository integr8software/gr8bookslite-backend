import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { BankMasterfileService } from './bank-masterfile.service';
import { BankMasterfileLookupService } from './lookups/bank-masterfile-lookup.service';
import {
  BankAccountContainerResponseDto,
  BankAccountListResponseDto,
  BankAccountOptionsResponseDto,
  BankNextAccountCodeResponseDto,
  ImportBankAccountsResponseDto,
  SaveBankAccountResponseDto,
} from './dto/bank-account-response.dto';
import { CreateBankAccountDto } from './dto/create-bank-account.dto';
import { GetBankAccountListQueryDto } from './dto/get-bank-account-list-query.dto';
import { ImportBankAccountsDto } from './dto/import-bank-accounts.dto';
import { UpdateBankAccountStatusDto } from './dto/update-bank-account-status.dto';
import { UpdateBankAccountDto } from './dto/update-bank-account.dto';

@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
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
  @ApiOperation({ summary: 'Get paginated list of bank account records' })
  @ApiOkResponse({ type: BankAccountListResponseDto })
  findAll(@CurrentUser() user: AuthUser, @Query() query: GetBankAccountListQueryDto) {
    return this.bankMasterfileService.findAll(user, query);
  }

  @Get('options')
  @ApiOperation({ summary: 'Get bank account options' })
  @ApiOkResponse({ type: BankAccountOptionsResponseDto })
  findOptions(@CurrentUser() user: AuthUser, @Query() query: GetBankAccountListQueryDto) {
    return this.bankMasterfileLookupService.findOptionsForCompanyUser(user, query);
  }

  @Get('next-account-code')
  @ApiOperation({ summary: 'Get next bank account code' })
  @ApiOkResponse({ type: BankNextAccountCodeResponseDto })
  getNextAccountCode(@CurrentUser() user: AuthUser) {
    return this.bankMasterfileService.getNextAccountCode(user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get bank account details by ID' })
  @ApiOkResponse({ type: BankAccountContainerResponseDto })
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.bankMasterfileService.findOne(user, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a bank account record' })
  @ApiCreatedResponse({ type: SaveBankAccountResponseDto })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateBankAccountDto) {
    return this.bankMasterfileService.create(user, dto);
  }
  @Post('import')
  @ApiOperation({ summary: 'Import bank account records' })
  @ApiCreatedResponse({ type: ImportBankAccountsResponseDto })
  importBankAccounts(@CurrentUser() user: AuthUser, @Body() dto: ImportBankAccountsDto) {
    return this.bankMasterfileService.importBankAccounts(user, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a bank account record' })
  @ApiOkResponse({ type: SaveBankAccountResponseDto })
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateBankAccountDto) {
    return this.bankMasterfileService.update(user, id, dto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update bank account status' })
  @ApiOkResponse({ type: SaveBankAccountResponseDto })
  updateStatus(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateBankAccountStatusDto) {
    return this.bankMasterfileService.updateStatus(user, id, dto);
  }
}
