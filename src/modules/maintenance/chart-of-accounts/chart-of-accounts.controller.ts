import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ChartOfAccountsService } from './chart-of-accounts.service';
import { ChartOfAccountsLookupService } from './lookups/chart-of-accounts-lookup.service';
import {
  ChartAccountContainerResponseDto,
  ChartAccountListResponseDto,
  ChartAccountNextCodeResponseDto,
  ChartAccountOptionsResponseDto,
  ChartAccountSaveResponseDto,
  ChartAccountTreeResponseDto,
} from './dto/chart-account-response.dto';
import { CreateChartAccountDto } from './dto/create-chart-account.dto';
import { GetChartAccountListQueryDto } from './dto/get-chart-account-list-query.dto';
import { GetNextChartAccountCodeQueryDto } from './dto/get-next-chart-account-code-query.dto';
import { UpdateChartAccountStatusDto } from './dto/update-chart-account-status.dto';
import { UpdateChartAccountDto } from './dto/update-chart-account.dto';

@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiTags('Chart of Accounts')
@Controller({
  path: 'maintenance/chart-of-accounts',
  version: '1',
})
export class ChartOfAccountsController {
  constructor(
    private readonly chartOfAccountsService: ChartOfAccountsService,
    private readonly chartOfAccountsLookupService: ChartOfAccountsLookupService,
  ) {}

  @Get()
  @ApiOkResponse({ type: ChartAccountListResponseDto })
  findAll(@CurrentUser() user: AuthUser, @Query() query: GetChartAccountListQueryDto) {
    return this.chartOfAccountsService.findAll(user, query);
  }

  @Get('posting-accounts')
  @ApiOkResponse({ type: ChartAccountOptionsResponseDto })
  findPostingAccounts(@CurrentUser() user: AuthUser, @Query() query: GetChartAccountListQueryDto) {
    return this.chartOfAccountsLookupService.findPostingOptionsForCompanyUser(user, query);
  }

  @Get('all-accounts')
  @ApiOkResponse({ type: ChartAccountOptionsResponseDto })
  findAllAccounts(@CurrentUser() user: AuthUser, @Query() query: GetChartAccountListQueryDto) {
    return this.chartOfAccountsLookupService.findAllOptionsForCompanyUser(user, query);
  }

  @Get('options')
  @ApiOkResponse({ type: ChartAccountOptionsResponseDto })
  findOptions(@CurrentUser() user: AuthUser, @Query() query: GetChartAccountListQueryDto) {
    return this.chartOfAccountsLookupService.findOptionsForCompanyUser(user, query);
  }

  @Get('tree')
  @ApiOkResponse({ type: ChartAccountTreeResponseDto })
  findTree(@CurrentUser() user: AuthUser) {
    return this.chartOfAccountsService.findTree(user);
  }

  @Get('next-code')
  @ApiOkResponse({ type: ChartAccountNextCodeResponseDto })
  findNextCode(@CurrentUser() user: AuthUser, @Query() query: GetNextChartAccountCodeQueryDto) {
    return this.chartOfAccountsService.findNextCode(user, query);
  }

  @Get(':id')
  @ApiOkResponse({ type: ChartAccountContainerResponseDto })
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.chartOfAccountsService.findOne(user, id);
  }

  @Post()
  @ApiCreatedResponse({ type: ChartAccountSaveResponseDto })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateChartAccountDto) {
    return this.chartOfAccountsService.create(user, dto);
  }

  @Patch(':id')
  @ApiOkResponse({ type: ChartAccountSaveResponseDto })
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateChartAccountDto) {
    return this.chartOfAccountsService.update(user, id, dto);
  }

  @Patch(':id/status')
  @ApiOkResponse({ type: ChartAccountSaveResponseDto })
  updateStatus(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateChartAccountStatusDto) {
    return this.chartOfAccountsService.updateStatus(user, id, dto);
  }
}
