import { BadRequestException, Injectable } from '@nestjs/common';
import { ChartAccount, ChartAccountStatus, Prisma, TaxAmountSource, TaxMaintenanceStatus, TaxPostingEvent, TaxTransactionScope } from '@prisma/client';
import { parseUtcDateOnly } from '../../../common/utils/date.util';
import { parsePositiveBigIntId } from '../../../common/utils/id.util';
import { PrismaService } from '../../../prisma/prisma.service';
import { TaxModuleCode } from '../constants/tax.constants';
import { CalculateTaxesDto } from '../dto/calculate-taxes.dto';
import type { CalculatedTaxLine, ResolvedCalculatedTaxLine } from '../types/tax-engine.type';
import { calculateTaxAmounts, roundTaxAmount } from '../utils/tax-calculation.util';

@Injectable()
export class TaxCalculationService {
  constructor(private readonly prisma: PrismaService) {}

  async calculate(companyId: number, dto: CalculateTaxesDto) {
    if ((dto.transactionScope as TaxTransactionScope) === TaxTransactionScope.BOTH) {
      throw new BadRequestException('A transaction must be identified as either a sale or a purchase.');
    }

    const transactionDate = parseUtcDateOnly(dto.transactionDate, 'transactionDate');
    const postingEvent = dto.postingEvent ?? TaxPostingEvent.RECOGNITION;
    const currencyScale = dto.currencyScale ?? 2;
    const lines = await Promise.all(
      dto.taxes.map((item) =>
        this.calculateTaxLine(
          companyId,
          parsePositiveBigIntId(item.taxId, 'taxId'),
          new Prisma.Decimal(item.taxableAmount),
          transactionDate,
          dto.transactionScope,
          postingEvent,
          currencyScale,
        ),
      ),
    );
    const totalTaxAmount = lines.reduce((total, line) => total.plus(line.taxAmount), new Prisma.Decimal(0));
    const totalRecoverableAmount = lines.reduce((total, line) => total.plus(line.recoverableAmount), new Prisma.Decimal(0));

    return {
      transactionDate,
      transactionScope: dto.transactionScope,
      postingEvent,
      currencyCode: dto.currencyCode,
      lines: lines.map(serializeCalculatedTaxLine),
      totals: {
        taxAmount: roundTaxAmount(totalTaxAmount, currencyScale).toFixed(currencyScale),
        recoverableAmount: roundTaxAmount(totalRecoverableAmount, currencyScale).toFixed(currencyScale),
      },
    };
  }

  private async calculateTaxLine(
    companyId: number,
    taxDefinitionId: bigint,
    inputAmount: Prisma.Decimal,
    transactionDate: Date,
    transactionScope: Exclude<TaxTransactionScope, 'BOTH'>,
    postingEvent: TaxPostingEvent,
    currencyScale: number,
  ): Promise<ResolvedCalculatedTaxLine> {
    const tax = await this.prisma.taxMaintenance.findFirst({
      where: {
        id: taxDefinitionId,
        status: TaxMaintenanceStatus.ACTIVE,
        deletedAt: null,
        transactionScope: {
          in: [transactionScope, TaxTransactionScope.BOTH],
        },
        companyConfigurations: {
          some: { companyId, isEnabled: true },
        },
      },
      include: {
        rateVersions: {
          where: {
            status: TaxMaintenanceStatus.ACTIVE,
            effectiveFrom: { lte: transactionDate },
            OR: [{ effectiveTo: null }, { effectiveTo: { gte: transactionDate } }],
          },
          orderBy: { effectiveFrom: 'desc' },
          take: 1,
        },
        postingRules: {
          where: {
            transactionScope,
            postingEvent,
            isActive: true,
          },
          orderBy: [{ priority: 'asc' }, { id: 'asc' }],
        },
      },
    });
    if (!tax) {
      throw new BadRequestException('The selected tax is not enabled for this company or transaction scope.');
    }

    const rateVersion = tax.rateVersions[0];
    if (!rateVersion) {
      throw new BadRequestException(`No effective rate exists for ${tax.code} on ${transactionDate.toISOString().slice(0, 10)}.`);
    }

    const amounts = calculateTaxAmounts(
      inputAmount,
      rateVersion.percentage,
      rateVersion.calculationMethod,
      tax.treatment,
      rateVersion.recoverablePercentage,
      currencyScale,
    );
    const roles = [...new Set(tax.postingRules.map((rule) => rule.accountRole))];
    const mappings = await this.prisma.companyAccountMapping.findMany({
      where: {
        companyId,
        moduleCode: TaxModuleCode,
        accountRole: { in: roles },
      },
      include: { chartAccount: true },
    });
    const accountByRole = new Map(mappings.map((mapping) => [mapping.accountRole, mapping.chartAccount]));
    const postings = tax.postingRules.map((rule) => {
      const account = accountByRole.get(rule.accountRole);
      this.assertUsablePostingAccount(account, companyId, rule.accountRole);
      return {
        accountRole: rule.accountRole,
        accountId: account.id,
        accountCode: account.accountCode,
        accountTitle: account.accountTitle,
        side: rule.entrySide,
        amount: rule.amountSource === TaxAmountSource.RECOVERABLE_AMOUNT ? amounts.recoverableAmount : amounts.taxAmount,
      };
    });

    return {
      taxDefinitionId: tax.id,
      taxRateVersionId: rateVersion.id,
      taxCode: tax.code,
      taxName: tax.name,
      jurisdictionCode: tax.jurisdictionCode,
      transactionScope,
      postingEvent,
      percentageApplied: rateVersion.percentage,
      calculationMethod: rateVersion.calculationMethod,
      inputAmount,
      ...amounts,
      postings,
    };
  }

  private assertUsablePostingAccount(account: ChartAccount | undefined, companyId: number, accountRole: string): asserts account is ChartAccount {
    if (
      !account ||
      account.companyId !== companyId ||
      account.status !== ChartAccountStatus.ACTIVE ||
      account.deletedAt !== null ||
      !account.isPostingAccount
    ) {
      throw new BadRequestException(`Configure the company's ${accountRole} tax account before posting this transaction.`);
    }
  }
}

function serializeCalculatedTaxLine(line: ResolvedCalculatedTaxLine): CalculatedTaxLine {
  return {
    taxDefinitionId: line.taxDefinitionId.toString(),
    taxRateVersionId: line.taxRateVersionId.toString(),
    taxCode: line.taxCode,
    taxName: line.taxName,
    jurisdictionCode: line.jurisdictionCode,
    transactionScope: line.transactionScope,
    postingEvent: line.postingEvent,
    percentageApplied: line.percentageApplied.toString(),
    calculationMethod: line.calculationMethod,
    inputAmount: line.inputAmount.toString(),
    taxableAmount: line.taxableAmount.toString(),
    taxAmount: line.taxAmount.toString(),
    recoverableAmount: line.recoverableAmount.toString(),
    postings: line.postings.map((posting) => ({
      accountRole: posting.accountRole,
      accountId: posting.accountId.toString(),
      accountCode: posting.accountCode,
      accountTitle: posting.accountTitle,
      side: posting.side,
      amount: posting.amount.toString(),
    })),
  };
}
