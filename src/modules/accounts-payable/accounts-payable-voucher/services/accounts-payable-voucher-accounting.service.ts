import { BadRequestException, Injectable } from '@nestjs/common';
import type { AccountsPayableVoucherDetails, Prisma } from '@prisma/client';
import type { AccountsPayableVoucherDetailsDto } from '../dto/accounts-payable-voucher-details.dto';
import type { JournalEntryDto } from '../dto/journal-entry.dto';
import type { AccountsPayableVoucherJournalEntry } from '../types/accounts-payable-voucher-with-details.type';
import { amountsMatch, getAccountsPayableVoucherDetailTotals, getJournalEntryTotals, roundCurrency } from '../utils/accounts-payable-voucher-totals.util';

const AccountsPayableVoucherReferenceType = 'APV';
type PersistedJournalEntry =
  | AccountsPayableVoucherJournalEntry
  | { referenceType: string; lineNumber: number; debit: Prisma.Decimal | number | string; credit: Prisma.Decimal | number | string };

@Injectable()
export class AccountsPayableVoucherAccountingService {
  validateSubmittedPayload({
    currencyCode,
    details,
    exchangeRate,
    journalEntries,
    voucherAmount,
  }: {
    currencyCode: string;
    details: AccountsPayableVoucherDetailsDto[];
    exchangeRate: number;
    journalEntries: JournalEntryDto[];
    voucherAmount: number;
  }) {
    this.validateDetailRows(details, currencyCode, exchangeRate);
    this.validateJournalRows(journalEntries, currencyCode, exchangeRate);

    const detailTotals = getAccountsPayableVoucherDetailTotals(details);
    const journalTotals = getJournalEntryTotals(journalEntries);

    if (!amountsMatch(detailTotals.totalAmountDue, voucherAmount)) {
      throw new BadRequestException('Detail total payable must match voucher amount.');
    }

    if (!amountsMatch(journalTotals.debit, journalTotals.credit)) {
      throw new BadRequestException('Journal entry debit and credit totals must balance.');
    }

    if (!amountsMatch(journalTotals.debit, detailTotals.grossAmount) || !amountsMatch(journalTotals.credit, detailTotals.grossAmount)) {
      throw new BadRequestException('Journal entry totals must match the APV detail gross amount.');
    }

    return {
      detailGrossAmount: detailTotals.grossAmount,
      detailTotalAmountDue: detailTotals.totalAmountDue,
      totalCredit: journalTotals.credit,
      totalDebit: journalTotals.debit,
    };
  }

  validatePersistedPayload({
    amount,
    details,
    journalEntries,
  }: {
    amount: number;
    details: AccountsPayableVoucherDetails[];
    journalEntries: PersistedJournalEntry[];
  }) {
    if (details.length === 0) {
      throw new BadRequestException('Add at least one APV detail row before approval.');
    }

    if (journalEntries.length < 2) {
      throw new BadRequestException('Add at least two journal entry rows before approval.');
    }

    const detailGrossAmount = roundCurrency(details.reduce((sum, detail) => sum + Number(detail.amount), 0));
    const detailTotalAmountDue = roundCurrency(details.reduce((sum, detail) => sum + Number(detail.totalAmountDue), 0));
    const totalDebit = roundCurrency(journalEntries.reduce((sum, entry) => sum + Number(entry.debit), 0));
    const totalCredit = roundCurrency(journalEntries.reduce((sum, entry) => sum + Number(entry.credit), 0));

    for (const detail of details) {
      if (Math.abs(Number(detail.amount)) <= 0) {
        throw new BadRequestException('Detail row amount must be non-zero before approval.');
      }
    }

    for (const entry of journalEntries) {
      if (entry.referenceType !== AccountsPayableVoucherReferenceType) {
        throw new BadRequestException('APV journal rows must use referenceType APV.');
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

    if (!amountsMatch(detailTotalAmountDue, amount)) {
      throw new BadRequestException('Detail total payable must match voucher amount before approval.');
    }

    if (!amountsMatch(totalDebit, totalCredit)) {
      throw new BadRequestException('Journal entry debit and credit totals must balance before approval.');
    }

    if (!amountsMatch(totalDebit, detailGrossAmount) || !amountsMatch(totalCredit, detailGrossAmount)) {
      throw new BadRequestException('Journal entry totals must match APV detail gross amount before approval.');
    }
  }

  private validateDetailRows(details: AccountsPayableVoucherDetailsDto[], currencyCode: string, exchangeRate: number) {
    if (details.length === 0) {
      throw new BadRequestException('Add at least one APV detail row.');
    }

    for (const detail of details) {
      if (Math.abs(Number(detail.amount || 0)) <= 0) {
        throw new BadRequestException(`Detail line ${detail.lineNumber} amount must be non-zero.`);
      }

      if (detail.currencyCode.trim().toUpperCase() !== currencyCode) {
        throw new BadRequestException(`Detail line ${detail.lineNumber} currency must match the voucher currency.`);
      }

      if (!amountsMatch(Number(detail.exchangeRate), exchangeRate)) {
        throw new BadRequestException(`Detail line ${detail.lineNumber} exchange rate must match the voucher exchange rate.`);
      }
    }
  }

  private validateJournalRows(journalEntries: JournalEntryDto[], currencyCode: string, exchangeRate: number) {
    if (journalEntries.length < 2) {
      throw new BadRequestException('Add at least two journal entry rows.');
    }

    for (const entry of journalEntries) {
      if (entry.referenceType && entry.referenceType !== AccountsPayableVoucherReferenceType) {
        throw new BadRequestException('APV journal rows must use referenceType APV.');
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
        throw new BadRequestException(`Journal line ${entry.lineNumber} currency must match the voucher currency.`);
      }

      if (!amountsMatch(Number(entry.exchangeRate), exchangeRate)) {
        throw new BadRequestException(`Journal line ${entry.lineNumber} exchange rate must match the voucher exchange rate.`);
      }
    }
  }
}
