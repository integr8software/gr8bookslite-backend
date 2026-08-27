import { BadRequestException, Injectable } from '@nestjs/common';
import type { AcknowledgementReceiptDetails } from '@prisma/client';
import type { AcknowledgementReceiptDetailDto } from '../dto/acknowledgement-receipt-detail.dto';
import type { AcknowledgementReceiptJournalEntryDto } from '../dto/acknowledgement-receipt-journal-entry.dto';
import type { AcknowledgementReceiptJournalEntry } from '../types/acknowledgement-receipt-with-details.type';
import { amountsMatch, getJournalEntryTotals, getAcknowledgementReceiptDetailTotals } from '../utils/acknowledgement-receipt-totals.util';

const AcknowledgementReceiptReferenceType = 'AR';

@Injectable()
export class AcknowledgementReceiptAccountingService {
  validateSubmittedPayload({
    currencyCode,
    details,
    exchangeRate,
    grossAmount,
    journalEntries,
  }: {
    currencyCode: string;
    details: AcknowledgementReceiptDetailDto[];
    exchangeRate: number;
    grossAmount: number;
    journalEntries: AcknowledgementReceiptJournalEntryDto[];
  }) {
    this.validateDetailRows(details);
    this.validateJournalRows(journalEntries, currencyCode, exchangeRate);

    const detailTotals = getAcknowledgementReceiptDetailTotals(details);
    const journalTotals = getJournalEntryTotals(journalEntries);

    if (!amountsMatch(detailTotals.grossAmount, grossAmount)) {
      throw new BadRequestException('Item gross amount total must match receipt gross amount.');
    }

    if (!amountsMatch(journalTotals.debit, journalTotals.credit)) {
      throw new BadRequestException('Journal entry debit and credit totals must balance.');
    }
  }

  validatePersistedPayload({ details, journalEntries }: { details: AcknowledgementReceiptDetails[]; journalEntries: AcknowledgementReceiptJournalEntry[] }) {
    if (details.length === 0) {
      throw new BadRequestException('Add at least one Acknowledgement Receipt item before posting.');
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
      if (entry.referenceType !== AcknowledgementReceiptReferenceType) {
        throw new BadRequestException('Acknowledgement Receipt journal rows must use referenceType AR.');
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

  private validateDetailRows(details: AcknowledgementReceiptDetailDto[]) {
    if (details.length === 0) {
      throw new BadRequestException('Add at least one Acknowledgement Receipt item.');
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

  private validateJournalRows(journalEntries: AcknowledgementReceiptJournalEntryDto[], currencyCode: string, exchangeRate: number) {
    if (journalEntries.length < 2) {
      throw new BadRequestException('Add at least two journal entry rows.');
    }

    for (const entry of journalEntries) {
      if (entry.referenceType && entry.referenceType !== AcknowledgementReceiptReferenceType) {
        throw new BadRequestException('Acknowledgement Receipt journal rows must use referenceType AR.');
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
