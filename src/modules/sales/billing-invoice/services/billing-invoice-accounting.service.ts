import { BadRequestException, Injectable } from '@nestjs/common';
import type { BillingInvoiceDetails } from '@prisma/client';
import type { BillingInvoiceDetailDto } from '../dto/billing-invoice-detail.dto';
import type { BillingInvoiceJournalEntryDto } from '../dto/billing-invoice-journal-entry.dto';
import type { BillingInvoiceJournalEntry } from '../types/billing-invoice-with-details.type';
import { amountsMatch, getJournalEntryTotals, getBillingInvoiceDetailTotals } from '../utils/billing-invoice-totals.util';

const BillingInvoiceReferenceType = 'BI';

@Injectable()
export class BillingInvoiceAccountingService {
  validateSubmittedPayload({
    currencyCode,
    details,
    exchangeRate,
    grossAmount,
    journalEntries,
  }: {
    currencyCode: string;
    details: BillingInvoiceDetailDto[];
    exchangeRate: number;
    grossAmount: number;
    journalEntries: BillingInvoiceJournalEntryDto[];
  }) {
    this.validateDetailRows(details);
    this.validateJournalRows(journalEntries, currencyCode, exchangeRate);

    const detailTotals = getBillingInvoiceDetailTotals(details);
    const journalTotals = getJournalEntryTotals(journalEntries);

    if (!amountsMatch(detailTotals.grossAmount, grossAmount)) {
      throw new BadRequestException('Item gross amount total must match invoice gross amount.');
    }

    if (!amountsMatch(journalTotals.debit, journalTotals.credit)) {
      throw new BadRequestException('Journal entry debit and credit totals must balance.');
    }
  }

  validatePersistedPayload({ details, journalEntries }: { details: BillingInvoiceDetails[]; journalEntries: BillingInvoiceJournalEntry[] }) {
    if (details.length === 0) {
      throw new BadRequestException('Add at least one billing invoice item before posting.');
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
      if (entry.referenceType !== BillingInvoiceReferenceType) {
        throw new BadRequestException('Billing invoice journal rows must use referenceType SI.');
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

  private validateDetailRows(details: BillingInvoiceDetailDto[]) {
    if (details.length === 0) {
      throw new BadRequestException('Add at least one billing invoice item.');
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

  private validateJournalRows(journalEntries: BillingInvoiceJournalEntryDto[], currencyCode: string, exchangeRate: number) {
    if (journalEntries.length < 2) {
      throw new BadRequestException('Add at least two journal entry rows.');
    }

    for (const entry of journalEntries) {
      if (entry.referenceType && entry.referenceType !== BillingInvoiceReferenceType) {
        throw new BadRequestException('Billing invoice journal rows must use referenceType SI.');
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
