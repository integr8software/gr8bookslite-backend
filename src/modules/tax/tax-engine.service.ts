import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';
import { CalculateTaxesDto } from './dto/calculate-taxes.dto';
import { TaxAccessService } from './services/tax-access.service';
import { TaxCalculationService } from './services/tax-calculation.service';
import { TaxTransactionService } from './services/tax-transaction.service';
import type { RecordTransactionTaxesInput } from './types/tax-engine.type';

export type { CalculatedTaxLine, CalculatedTaxPosting, RecordTransactionTaxesInput } from './types/tax-engine.type';

@Injectable()
export class TaxEngineService {
  constructor(
    private readonly calculation: TaxCalculationService,
    private readonly transactions: TaxTransactionService,
    private readonly access: TaxAccessService,
  ) {}

  async calculateForUser(user: AuthUser, dto: CalculateTaxesDto) {
    const companyId = this.access.getActiveCompanyId(user);
    await this.access.assertCompanyAccess(user, companyId);
    return this.calculation.calculate(companyId, dto);
  }

  calculate(companyId: number, dto: CalculateTaxesDto) {
    return this.calculation.calculate(companyId, dto);
  }

  recordTransactionTaxes(input: RecordTransactionTaxesInput, tx?: Prisma.TransactionClient) {
    return this.transactions.recordTransactionTaxes(input, tx);
  }

  reverseTransactionTaxes(companyId: number, sourceType: string, sourceId: string, reversalSourceType: string, reversalSourceId: string) {
    return this.transactions.reverseTransactionTaxes(companyId, sourceType, sourceId, reversalSourceType, reversalSourceId);
  }

  refundTransactionTaxes(companyId: number, sourceType: string, sourceId: string, refundSourceType: string, refundSourceId: string, proportion: number) {
    return this.transactions.refundTransactionTaxes(companyId, sourceType, sourceId, refundSourceType, refundSourceId, proportion);
  }

  adjustTransactionTaxLine(
    companyId: number,
    originalTaxLineId: bigint,
    adjustmentSourceType: string,
    adjustmentSourceId: string,
    correctedTaxAmount: Prisma.Decimal.Value,
  ) {
    return this.transactions.adjustTransactionTaxLine(companyId, originalTaxLineId, adjustmentSourceType, adjustmentSourceId, correctedTaxAmount);
  }
}
