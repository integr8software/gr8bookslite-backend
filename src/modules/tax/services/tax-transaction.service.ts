import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TaxPostingEvent, TaxTransactionLineType } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import type { RecordTransactionTaxesInput } from '../types/tax-engine.type';
import { oppositeTaxEntrySide } from '../utils/tax-calculation.util';

@Injectable()
export class TaxTransactionService {
  constructor(private readonly prisma: PrismaService) {}

  recordTransactionTaxes(input: RecordTransactionTaxesInput, tx?: Prisma.TransactionClient) {
    const records = this.buildOriginalRecords(input);
    if (tx) {
      return Promise.all(
        records.map((record, index) =>
          tx.transactionTaxLine.create({
            data: { ...record, sequence: index + 1 },
          }),
        ),
      );
    }

    return this.prisma.$transaction(
      records.map((record, index) =>
        this.prisma.transactionTaxLine.create({
          data: { ...record, sequence: index + 1 },
        }),
      ),
    );
  }

  reverseTransactionTaxes(companyId: number, sourceType: string, sourceId: string, reversalSourceType: string, reversalSourceId: string) {
    return this.createProportionalRevision(
      companyId,
      sourceType,
      sourceId,
      reversalSourceType,
      reversalSourceId,
      TaxTransactionLineType.REVERSAL,
      TaxPostingEvent.REVERSAL,
      new Prisma.Decimal(1),
    );
  }

  refundTransactionTaxes(companyId: number, sourceType: string, sourceId: string, refundSourceType: string, refundSourceId: string, proportion: number) {
    if (proportion <= 0 || proportion > 1) {
      throw new BadRequestException('Refund proportion must be greater than zero and no more than one.');
    }
    return this.createProportionalRevision(
      companyId,
      sourceType,
      sourceId,
      refundSourceType,
      refundSourceId,
      TaxTransactionLineType.REFUND,
      TaxPostingEvent.REFUND,
      new Prisma.Decimal(proportion),
    );
  }

  async adjustTransactionTaxLine(
    companyId: number,
    originalTaxLineId: bigint,
    adjustmentSourceType: string,
    adjustmentSourceId: string,
    correctedTaxAmount: Prisma.Decimal.Value,
  ) {
    const original = await this.prisma.transactionTaxLine.findFirst({
      where: { id: originalTaxLineId, companyId },
    });
    if (!original) {
      throw new NotFoundException('Original transaction tax line not found.');
    }

    const corrected = new Prisma.Decimal(correctedTaxAmount);
    const difference = corrected.minus(original.taxAmount);
    if (difference.isZero()) {
      throw new BadRequestException('The corrected tax amount does not create an adjustment.');
    }

    const ratio = original.taxAmount.isZero() ? new Prisma.Decimal(0) : difference.abs().dividedBy(original.taxAmount);
    return this.prisma.transactionTaxLine.create({
      data: {
        companyId,
        sourceType: adjustmentSourceType,
        sourceId: adjustmentSourceId,
        sequence: 1,
        lineType: TaxTransactionLineType.ADJUSTMENT,
        originalTaxLineId: original.id,
        taxDefinitionId: original.taxDefinitionId,
        taxRateVersionId: original.taxRateVersionId,
        transactionScope: original.transactionScope,
        postingEvent: TaxPostingEvent.ADJUSTMENT,
        taxCodeSnapshot: original.taxCodeSnapshot,
        taxNameSnapshot: original.taxNameSnapshot,
        jurisdictionCodeSnapshot: original.jurisdictionCodeSnapshot,
        percentageApplied: original.percentageApplied,
        calculationMethodSnapshot: original.calculationMethodSnapshot,
        taxableAmount: original.taxableAmount.mul(ratio),
        taxAmount: difference.abs(),
        recoverableAmount: original.recoverableAmount.mul(ratio),
        postingAccountId: original.postingAccountId,
        postingAccountCodeSnapshot: original.postingAccountCodeSnapshot,
        postingAccountTitleSnapshot: original.postingAccountTitleSnapshot,
        postingAccountRole: original.postingAccountRole,
        postingSide: difference.isPositive() ? original.postingSide : oppositeTaxEntrySide(original.postingSide),
        currencyCode: original.currencyCode,
        transactionDate: new Date(),
      },
    });
  }

  private buildOriginalRecords(input: RecordTransactionTaxesInput) {
    return input.lines.flatMap((line) =>
      line.postings.map((posting) => ({
        companyId: input.companyId,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        lineType: TaxTransactionLineType.ORIGINAL,
        taxDefinitionId: BigInt(line.taxDefinitionId),
        taxRateVersionId: line.taxRateVersionId ? BigInt(line.taxRateVersionId) : null,
        transactionScope: line.transactionScope,
        postingEvent: line.postingEvent,
        taxCodeSnapshot: line.taxCode,
        taxNameSnapshot: line.taxName,
        jurisdictionCodeSnapshot: line.jurisdictionCode,
        percentageApplied: new Prisma.Decimal(line.percentageApplied),
        calculationMethodSnapshot: line.calculationMethod,
        taxableAmount: new Prisma.Decimal(line.taxableAmount),
        taxAmount: new Prisma.Decimal(posting.amount),
        recoverableAmount: new Prisma.Decimal(line.recoverableAmount),
        postingAccountId: BigInt(posting.accountId),
        postingAccountCodeSnapshot: posting.accountCode,
        postingAccountTitleSnapshot: posting.accountTitle,
        postingAccountRole: posting.accountRole,
        postingSide: posting.side,
        currencyCode: input.currencyCode,
        transactionDate: input.transactionDate,
      })),
    );
  }

  private async createProportionalRevision(
    companyId: number,
    sourceType: string,
    sourceId: string,
    revisionSourceType: string,
    revisionSourceId: string,
    lineType: TaxTransactionLineType,
    postingEvent: TaxPostingEvent,
    proportion: Prisma.Decimal,
  ) {
    const originals = await this.prisma.transactionTaxLine.findMany({
      where: {
        companyId,
        sourceType,
        sourceId,
        lineType: TaxTransactionLineType.ORIGINAL,
      },
      orderBy: { sequence: 'asc' },
    });
    if (originals.length === 0) {
      throw new NotFoundException('Original transaction tax lines not found.');
    }

    return this.prisma.$transaction(
      originals.map((original, index) =>
        this.prisma.transactionTaxLine.create({
          data: {
            companyId,
            sourceType: revisionSourceType,
            sourceId: revisionSourceId,
            sequence: index + 1,
            lineType,
            originalTaxLineId: original.id,
            taxDefinitionId: original.taxDefinitionId,
            taxRateVersionId: original.taxRateVersionId,
            transactionScope: original.transactionScope,
            postingEvent,
            taxCodeSnapshot: original.taxCodeSnapshot,
            taxNameSnapshot: original.taxNameSnapshot,
            jurisdictionCodeSnapshot: original.jurisdictionCodeSnapshot,
            percentageApplied: original.percentageApplied,
            calculationMethodSnapshot: original.calculationMethodSnapshot,
            taxableAmount: original.taxableAmount.mul(proportion),
            taxAmount: original.taxAmount.mul(proportion),
            recoverableAmount: original.recoverableAmount.mul(proportion),
            postingAccountId: original.postingAccountId,
            postingAccountCodeSnapshot: original.postingAccountCodeSnapshot,
            postingAccountTitleSnapshot: original.postingAccountTitleSnapshot,
            postingAccountRole: original.postingAccountRole,
            postingSide: oppositeTaxEntrySide(original.postingSide),
            currencyCode: original.currencyCode,
            transactionDate: new Date(),
          },
        }),
      ),
    );
  }
}
