import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CalculateTaxesDto } from './dto/calculate-taxes.dto';
import { CreateTaxDto } from './dto/create-tax.dto';
import { CreateTaxPostingRuleDto } from './dto/create-tax-posting-rule.dto';
import { CreateTaxRateVersionDto } from './dto/create-tax-rate-version.dto';
import { GetTaxListQueryDto } from './dto/get-tax-list-query.dto';
import { ReorderTaxesDto } from './dto/reorder-taxes.dto';
import { UpdateDefaultTaxAccountsDto } from './dto/update-default-tax-accounts.dto';
import { UpdateCompanyTaxConfigurationDto } from './dto/update-company-tax-configuration.dto';
import { UpdateTaxDto } from './dto/update-tax.dto';
import { UpsertTaxAccountMappingDto } from './dto/upsert-tax-account-mapping.dto';
import { TaxEngineService } from './tax-engine.service';
import { TaxService } from './tax.service';

@UseGuards(JwtAuthGuard)
@ApiTags('Tax')
@Controller({
  path: 'tax',
  version: '1',
})
export class TaxController {
  constructor(
    private readonly taxService: TaxService,
    private readonly taxEngineService: TaxEngineService,
  ) {}

  @Get()
  @ApiOkResponse({ description: 'Tax list retrieved.' })
  findAll(@CurrentUser() user: AuthUser, @Query() query: GetTaxListQueryDto) {
    return this.taxService.findAll(user, query);
  }

  @Get('default-accounts')
  @ApiOkResponse({ description: 'Default tax accounts retrieved.' })
  getDefaultAccounts(@CurrentUser() user: AuthUser) {
    return this.taxService.getDefaultAccounts(user);
  }

  @Patch('default-accounts')
  @ApiOkResponse({ description: 'Default tax account selections updated.' })
  updateDefaultAccounts(@CurrentUser() user: AuthUser, @Body() dto: UpdateDefaultTaxAccountsDto) {
    return this.taxService.updateDefaultAccounts(user, dto);
  }

  @Patch('account-mappings')
  @ApiOkResponse({ description: 'Company tax account role mapped to a company-owned chart account.' })
  upsertAccountMapping(@CurrentUser() user: AuthUser, @Body() dto: UpsertTaxAccountMappingDto) {
    return this.taxService.upsertAccountMapping(user, dto);
  }

  @Patch('reorder')
  @ApiOkResponse({ description: 'Global tax display order updated.' })
  reorder(@CurrentUser() user: AuthUser, @Body() dto: ReorderTaxesDto) {
    return this.taxService.reorder(user, dto);
  }

  @Post('calculate')
  @ApiOkResponse({ description: 'Taxes calculated using effective rates and company posting accounts.' })
  calculate(@CurrentUser() user: AuthUser, @Body() dto: CalculateTaxesDto) {
    return this.taxEngineService.calculateForUser(user, dto);
  }

  @Post(':id/rates')
  @ApiCreatedResponse({ description: 'Effective-dated tax rate created.' })
  createRateVersion(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: CreateTaxRateVersionDto) {
    return this.taxService.createRateVersion(user, id, dto);
  }

  @Post(':id/posting-rules')
  @ApiCreatedResponse({ description: 'Jurisdiction-specific tax posting rule saved.' })
  createPostingRule(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: CreateTaxPostingRuleDto) {
    return this.taxService.createPostingRule(user, id, dto);
  }

  @Patch(':id/company-configuration')
  @ApiOkResponse({ description: 'Company-specific tax availability and defaults updated.' })
  updateCompanyConfiguration(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateCompanyTaxConfigurationDto) {
    return this.taxService.updateCompanyConfiguration(user, id, dto);
  }

  @Get(':id')
  @ApiOkResponse({ description: 'Tax record retrieved.' })
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.taxService.findOne(user, id);
  }

  @Post()
  @ApiCreatedResponse({ description: 'Tax record created.' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateTaxDto) {
    return this.taxService.create(user, dto);
  }

  @Patch(':id')
  @ApiOkResponse({ description: 'Tax record updated.' })
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateTaxDto) {
    return this.taxService.update(user, id, dto);
  }
}
