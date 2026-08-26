import { BadRequestException, Injectable } from '@nestjs/common';
import type { CollectionReceiptDetails } from '@prisma/client';
import type { CollectionReceiptDetailDto } from '../dto/collection-receipt-detail.dto';
import type { CollectionReceiptJournalEntryDto } from '../dto/collection-receipt-journal-entry.dto';
import type { CollectionReceiptJournalEntry } from '../types/collection-receipt-with-details.type';
import { amountsMatch, getJournalEntryTotals, getCollectionReceiptDetailTotals } from '../utils/collection-receipt-totals.util';

const CollectionReceiptReferenceType = 'CR';

@Injectable()
export class CollectionReceiptAccountingService {
  validateSubmittedPayload({
    currencyCode,
    details,
    exchangeRate,
    grossAmount,
    journalEntries,
  }: {
    currencyCode: string;
    details: CollectionReceiptDetailDto[];
    exchangeRate: number;
    grossAmount: number;
    journalEntries: CollectionReceiptJournalEntryDto[];
  }) {
    this.validateDetailRows(details);
    this.validateJournalRows(journalEntries, currencyCode, exchangeRate);

    const detailTotals = getCollectionReceiptDetailTotals(details);
    const journalTotals = getJournalEntryTotals(journalEntries);

    if (!amountsMatch(detailTotals.grossAmount, grossAmount)) {
      throw new BadRequestException('Item gross amount total must match receipt gross amount.');
    }

    if (!amountsMatch(journalTotals.debit, journalTotals.credit)) {
      throw new BadRequestException('Journal entry debit and credit totals must balance.');
    }
  }

  validatePersistedPayload({ details, journalEntries }: { details: CollectionReceiptDetails[]; journalEntries: CollectionReceiptJournalEntry[] }) {
    if (details.length === 0) {
      throw new BadRequestException('Add at least one collection receipt item before posting.');
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
      if (entry.referenceType !== CollectionReceiptReferenceType) {
        throw new BadRequestException('Collection receipt journal rows must use referenceType CR.');
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

  private validateDetailRows(details: CollectionReceiptDetailDto[]) {
    if (details.length === 0) {
      throw new BadRequestException('Add at least one collection receipt item.');
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

  private validateJournalRows(journalEntries: CollectionReceiptJournalEntryDto[], currencyCode: string, exchangeRate: number) {
    if (journalEntries.length < 2) {
      throw new BadRequestException('Add at least two journal entry rows.');
    }

    for (const entry of journalEntries) {
      if (entry.referenceType && entry.referenceType !== CollectionReceiptReferenceType) {
        throw new BadRequestException('Collection receipt journal rows must use referenceType CR.');
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
        throw new BadRequestException(`Journal line ${entry.lineNumber} currency must match the receipt currency.`);
      }

      if (!amountsMatch(Number(entry.exchangeRate), exchangeRate)) {
        throw new BadRequestException(`Journal line ${entry.lineNumber} exchange rate must match the receipt exchange rate.`);
      }
    }
  }
}
