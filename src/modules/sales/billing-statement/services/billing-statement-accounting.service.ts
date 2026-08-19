import { BadRequestException, Injectable } from '@nestjs/common';
import type { BillingStatementDetails } from '@prisma/client';
import type { BillingStatementDetailDto } from '../dto/billing-statement-detail.dto';
import type { BillingStatementJournalEntryDto } from '../dto/billing-statement-journal-entry.dto';
import type { BillingStatementJournalEntry } from '../types/billing-statement-with-details.type';
import { amountsMatch, getJournalEntryTotals, getBillingStatementDetailTotals } from '../utils/billing-statement-totals.util';

const BillingStatementReferenceType = 'BS';

@Injectable()
export class BillingStatementAccountingService {
  validateSubmittedPayload({
    currencyCode,
    details,
    exchangeRate,
    grossAmount,
    journalEntries,
  }: {
    currencyCode: string;
    details: BillingStatementDetailDto[];
    exchangeRate: number;
    grossAmount: number;
    journalEntries: BillingStatementJournalEntryDto[];
  }) {
    this.validateDetailRows(details);
    this.validateJournalRows(journalEntries, currencyCode, exchangeRate);

    const detailTotals = getBillingStatementDetailTotals(details);
    const journalTotals = getJournalEntryTotals(journalEntries);

    if (!amountsMatch(detailTotals.grossAmount, grossAmount)) {
      throw new BadRequestException('Item gross amount total must match invoice gross amount.');
    }

    if (!amountsMatch(journalTotals.debit, journalTotals.credit)) {
      throw new BadRequestException('Journal entry debit and credit totals must balance.');
    }
  }

  validatePersistedPayload({ details, journalEntries }: { details: BillingStatementDetails[]; journalEntries: BillingStatementJournalEntry[] }) {
    if (details.length === 0) {
      throw new BadRequestException('Add at least one billingStatement item before posting.');
    }

    if (journalEntries.length < 2) {
      throw new BadRequestException('Add at least two journal entry rows before posting.');
    }

    const journalTotals = getJournalEntryTotals(journalEntries);

    for (const detail of details) {
      if (Math.abs(Number(detail.grossAmount)) <= 0) {
        throw new BadRequestException('Item gross amount must be non-zero before posting.');
      }
    }

    for (const entry of journalEntries) {
      if (entry.referenceType !== BillingStatementReferenceType) {
        throw new BadRequestException('Billing statement journal rows must use referenceType BS.');
      }

      const debit = Number(entry.debit);
      const credit = Number(entry.credit);

      if (debit > 0 && credit > 0) {
        throw new BadRequestException('Journal entry debit and credit cannot both be positive.');
      }

      if (debit <= 0 && credit <= 0) {
        throw new BadRequestException('Journal entry must have either debit or credit.');
      }
    }

    if (!amountsMatch(journalTotals.debit, journalTotals.credit)) {
      throw new BadRequestException('Journal entry debit and credit totals must balance before posting.');
    }
  }

  private validateDetailRows(details: BillingStatementDetailDto[]) {
    if (details.length === 0) {
      throw new BadRequestException('Add at least one billingStatement item.');
    }

    for (const detail of details) {
      if (!detail.description.trim()) {
        throw new BadRequestException(`Item line ${detail.lineNumber} description is required.`);
      }

      if (Math.abs(Number(detail.grossAmount || 0)) <= 0) {
        throw new BadRequestException(`Item line ${detail.lineNumber} gross amount must be non-zero.`);
      }
    }
  }

  private validateJournalRows(journalEntries: BillingStatementJournalEntryDto[], currencyCode: string, exchangeRate: number) {
    if (journalEntries.length < 2) {
      throw new BadRequestException('Add at least two journal entry rows.');
    }

    for (const entry of journalEntries) {
      if (entry.referenceType && entry.referenceType !== BillingStatementReferenceType) {
        throw new BadRequestException('Billing statement journal rows must use referenceType BS.');
      }

      const debit = Number(entry.debit || 0);
      const credit = Number(entry.credit || 0);

      if (debit > 0 && credit > 0) {
        throw new BadRequestException(`Journal line ${entry.lineNumber} cannot have both debit and credit.`);
      }

      if (debit <= 0 && credit <= 0) {
        throw new BadRequestException(`Journal line ${entry.lineNumber} must have either debit or credit.`);
      }

      if (entry.currencyCode.trim().toUpperCase() !== currencyCode) {
        throw new BadRequestException(`Journal line ${entry.lineNumber} currency must match the invoice currency.`);
      }

      if (!amountsMatch(Number(entry.exchangeRate), exchangeRate)) {
        throw new BadRequestException(`Journal line ${entry.lineNumber} exchange rate must match the invoice exchange rate.`);
      }
    }
  }
}
