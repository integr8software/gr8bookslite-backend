import { BadRequestException, Injectable } from '@nestjs/common';
import type { CashVoucherDetail } from '@prisma/client';
import type { CashVoucherDetailDto } from '../dto/cash-voucher-detail.dto';
import type { JournalEntryDto } from '../dto/journal-entry.dto';
import type { CashVoucherJournalEntry } from '../types/cash-voucher-with-details.type';
import { amountsMatch, getCashVoucherDetailTotals, getJournalEntryTotals, roundCurrency } from '../utils/cash-voucher-totals.util';

export const CashVoucherReferenceType = 'CV';

@Injectable()
export class CashVoucherAccountingService {
  validateSubmittedPayload({
    currencyCode,
    details,
    exchangeRate,
    journalEntries,
    voucherAmount,
  }: {
    currencyCode: string;
    details: CashVoucherDetailDto[];
    exchangeRate: number;
    journalEntries?: JournalEntryDto[];
    voucherAmount: number;
  }) {
    this.validateDetailRows(details, currencyCode, exchangeRate);

    if (journalEntries && journalEntries.length > 0) {
      this.validateJournalRows(journalEntries, currencyCode, exchangeRate);
      const journalTotals = getJournalEntryTotals(journalEntries);

      if (!amountsMatch(journalTotals.debit, journalTotals.credit)) {
        throw new BadRequestException('Journal entry debit and credit totals must balance.');
      }
    }

    // The UI submits the generated VAT, EWT, and settlement rows together with
    // the user-entered expense rows. Those rows are accounting counterparts,
    // not additional voucher detail amounts, so exclude them from this check.
    const detailTotals = getCashVoucherDetailTotals(details.filter(isSourceDetailRow));
    const expectedAmount = detailTotals.disburseAmount > 0 ? detailTotals.disburseAmount : detailTotals.grossAmount;

    if (expectedAmount > 0 && !amountsMatch(expectedAmount, voucherAmount)) {
      throw new BadRequestException('Detail total amount must match voucher amount.');
    }

    return {
      detailGrossAmount: detailTotals.grossAmount,
      detailDisburseAmount: detailTotals.disburseAmount,
      totalCredit: journalEntries ? getJournalEntryTotals(journalEntries).credit : 0,
      totalDebit: journalEntries ? getJournalEntryTotals(journalEntries).debit : 0,
    };
  }

  validatePersistedPayload({
    amount,
    details,
    journalEntries,
  }: {
    amount: number;
    details: CashVoucherDetail[];
    journalEntries: CashVoucherJournalEntry[];
  }) {
    if (details.length === 0) {
      throw new BadRequestException('Add at least one Cash Voucher detail row before approval.');
    }

    for (const detail of details) {
      const debit = Number(detail.debit);
      const gross = Number(detail.grossAmount);
      const disburse = Number(detail.disburseAmount);

      if (Math.abs(debit) <= 0 && Math.abs(gross) <= 0 && Math.abs(disburse) <= 0) {
        throw new BadRequestException('Detail row amount must be non-zero before approval.');
      }
    }

    if (journalEntries && journalEntries.length > 0) {
      if (journalEntries.length < 2) {
        throw new BadRequestException('Add at least two journal entry rows before approval.');
      }

      const totalDebit = roundCurrency(journalEntries.reduce((sum, entry) => sum + Number(entry.debit), 0));
      const totalCredit = roundCurrency(journalEntries.reduce((sum, entry) => sum + Number(entry.credit), 0));

      for (const entry of journalEntries) {
        if (entry.referenceType !== CashVoucherReferenceType) {
          throw new BadRequestException(`Cash Voucher journal rows must use referenceType ${CashVoucherReferenceType}.`);
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

      if (!amountsMatch(totalDebit, totalCredit)) {
        throw new BadRequestException('Journal entry debit and credit totals must balance before approval.');
      }
    }
  }

  private validateDetailRows(details: CashVoucherDetailDto[], currencyCode: string, exchangeRate: number) {
    if (details.length === 0) {
      throw new BadRequestException('Add at least one Cash Voucher detail row.');
    }

    for (const detail of details) {
      const amountVal = Number(detail.debit ?? detail.grossAmount ?? detail.disburseAmount ?? 0);
      if (Math.abs(amountVal) < 0) {
        throw new BadRequestException(`Detail line ${detail.lineNumber} amount must be non-zero.`);
      }
    }
  }

  private validateJournalRows(journalEntries: JournalEntryDto[], currencyCode: string, exchangeRate: number) {
    if (journalEntries.length < 2) {
      throw new BadRequestException('Add at least two journal entry rows when providing accounting entries.');
    }

    for (const entry of journalEntries) {
      if (entry.referenceType && entry.referenceType !== CashVoucherReferenceType) {
        throw new BadRequestException(`Cash Voucher journal rows must use referenceType ${CashVoucherReferenceType}.`);
      }

      const debit = Number(entry.debit || 0);
      const credit = Number(entry.credit || 0);

      if (debit > 0 && credit > 0) {
        throw new BadRequestException(`Journal line ${entry.lineNumber} cannot have both debit and credit.`);
      }

      if (debit <= 0 && credit <= 0) {
        throw new BadRequestException(`Journal line ${entry.lineNumber} must have either debit or credit.`);
      }

      if (entry.currencyCode && entry.currencyCode.trim().toUpperCase() !== currencyCode) {
        throw new BadRequestException(`Journal line ${entry.lineNumber} currency must match the voucher currency.`);
      }

      if (entry.exchangeRate && !amountsMatch(Number(entry.exchangeRate), exchangeRate)) {
        throw new BadRequestException(`Journal line ${entry.lineNumber} exchange rate must match the voucher exchange rate.`);
      }
    }
  }
}

function isSourceDetailRow(detail: CashVoucherDetailDto): boolean {
  const generatedId = detail.id?.toLowerCase() ?? '';
  const accountTitle = detail.accountTitle.trim().toLowerCase();
  const debit = Number(detail.debit ?? 0);
  const credit = Number(detail.credit ?? 0);

  if (generatedId.startsWith('auto-')) {
    return false;
  }

  // Keep compatibility with older clients that did not send the generated row ID.
  if (accountTitle === 'input vat' || accountTitle === 'expanded withholding tax') {
    return false;
  }

  // Cash/bank settlement rows are credit-only generated rows.
  if (credit > 0 && debit <= 0) {
    return false;
  }

  return true;
}
