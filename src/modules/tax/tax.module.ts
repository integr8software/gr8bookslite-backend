import { Module } from '@nestjs/common';
import { AccessControlModule } from '../../common/access/access-control.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { TaxController } from './tax.controller';
import { TaxEngineService } from './tax-engine.service';
import { TaxService } from './tax.service';
import { TaxAccessService } from './services/tax-access.service';
import { TaxCalculationService } from './services/tax-calculation.service';
import { TaxCatalogService } from './services/tax-catalog.service';
import { TaxCompanyConfigurationService } from './services/tax-company-configuration.service';
import { TaxPostingRuleService } from './services/tax-posting-rule.service';
import { TaxRateService } from './services/tax-rate.service';
import { TaxTransactionService } from './services/tax-transaction.service';

@Module({
  imports: [PrismaModule, AccessControlModule, AuthModule],
  controllers: [TaxController],
  providers: [
    TaxAccessService,
    TaxCalculationService,
    TaxCatalogService,
    TaxCompanyConfigurationService,
    TaxPostingRuleService,
    TaxRateService,
    TaxTransactionService,
    TaxService,
    TaxEngineService,
  ],
  exports: [TaxService, TaxEngineService],
})
export class TaxModule {}
