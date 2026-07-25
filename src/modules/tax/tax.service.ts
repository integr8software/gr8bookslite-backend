import { Injectable } from '@nestjs/common';
import { TaxTransactionScope } from '@prisma/client';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';
import { CreateTaxDto } from './dto/create-tax.dto';
import { CreateTaxPostingRuleDto } from './dto/create-tax-posting-rule.dto';
import { CreateTaxRateVersionDto } from './dto/create-tax-rate-version.dto';
import { GetTaxListQueryDto } from './dto/get-tax-list-query.dto';
import { ReorderTaxesDto } from './dto/reorder-taxes.dto';
import { UpdateCompanyTaxConfigurationDto } from './dto/update-company-tax-configuration.dto';
import { UpdateDefaultTaxAccountsDto } from './dto/update-default-tax-accounts.dto';
import { UpdateTaxDto } from './dto/update-tax.dto';
import { UpsertTaxAccountMappingDto } from './dto/upsert-tax-account-mapping.dto';
import { TaxCatalogService } from './services/tax-catalog.service';
import { TaxCompanyConfigurationService } from './services/tax-company-configuration.service';
import { TaxPostingRuleService } from './services/tax-posting-rule.service';
import { TaxRateService } from './services/tax-rate.service';

@Injectable()
export class TaxService {
  constructor(
    private readonly catalog: TaxCatalogService,
    private readonly companyConfiguration: TaxCompanyConfigurationService,
    private readonly rates: TaxRateService,
    private readonly postingRules: TaxPostingRuleService,
  ) {}

  findAll(user: AuthUser, query: GetTaxListQueryDto) {
    return this.catalog.findAll(user, query);
  }

  findOne(user: AuthUser, id: string) {
    return this.catalog.findOne(user, id);
  }

  reorder(user: AuthUser, dto: ReorderTaxesDto) {
    return this.catalog.reorder(user, dto);
  }

  create(user: AuthUser, dto: CreateTaxDto) {
    return this.catalog.create(user, dto);
  }

  update(user: AuthUser, id: string, dto: UpdateTaxDto) {
    return this.catalog.update(user, id, dto);
  }

  resolveTaxForTransaction(companyId: number, taxMaintenanceId: bigint, transactionScope: Exclude<TaxTransactionScope, 'BOTH'>) {
    return this.companyConfiguration.resolveTaxForTransaction(companyId, taxMaintenanceId, transactionScope);
  }

  getDefaultAccounts(user: AuthUser) {
    return this.companyConfiguration.getDefaultAccounts(user);
  }

  updateDefaultAccounts(user: AuthUser, dto: UpdateDefaultTaxAccountsDto) {
    return this.companyConfiguration.updateDefaultAccounts(user, dto);
  }

  upsertAccountMapping(user: AuthUser, dto: UpsertTaxAccountMappingDto) {
    return this.companyConfiguration.upsertAccountMapping(user, dto);
  }

  updateCompanyConfiguration(user: AuthUser, id: string, dto: UpdateCompanyTaxConfigurationDto) {
    return this.companyConfiguration.updateCompanyConfiguration(user, id, dto);
  }

  createRateVersion(user: AuthUser, id: string, dto: CreateTaxRateVersionDto) {
    return this.rates.createRateVersion(user, id, dto);
  }

  createPostingRule(user: AuthUser, id: string, dto: CreateTaxPostingRuleDto) {
    return this.postingRules.createPostingRule(user, id, dto);
  }
}
