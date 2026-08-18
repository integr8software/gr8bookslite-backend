import { BadRequestException, Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { JournalVoucherLineDto } from '../dto/journal-voucher-line.dto';
import type { JournalVoucherJournalEntry } from '../types/journal-voucher-with-entries.type';
import { amountsMatch, getJournalVoucherTotals } from '../utils/journal-voucher-totals.util';

const JournalVoucherReferenceType = 'JV';

@Injectable()
export class JournalVoucherAccountingService {
  validateSubmittedPayload({ currencyCode, exchangeRate, lines }: { currencyCode: string; exchangeRate: number; lines: JournalVoucherLineDto[] }) {
    this.validateLineCount(lines);
    this.validateLineNumbers(lines);

    for (const line of lines) {
      this.validateLineAmounts(line);
    }

    if (!currencyCode.trim()) {
      throw new BadRequestException('Currency is required.');
    }

    if (!Number.isFinite(exchangeRate) || exchangeRate <= 0) {
      throw new BadRequestException('Exchange rate must be greater than zero.');
    }

    const totals = getJournalVoucherTotals(lines);

    if (totals.debit <= 0 || totals.credit <= 0) {
      throw new BadRequestException('Journal voucher must contain debit and credit amounts.');
    }

    if (!amountsMatch(totals.debit, totals.credit)) {
      throw new BadRequestException('Journal voucher debit and credit totals must balance.');
    }

    return {
      totalCredit: totals.credit,
      totalDebit: totals.debit,
    };
  }

  validatePersistedPayload(entries: JournalVoucherJournalEntry[]) {
    this.validateLineCount(entries);

    for (const entry of entries) {
      if (entry.referenceType !== JournalVoucherReferenceType) {
        throw new BadRequestException('JV journal rows must use referenceType JV.');
      }

      this.validateLineAmounts(entry);
    }

    const totals = getJournalVoucherTotals(entries);

    if (totals.debit <= 0 || totals.credit <= 0 || !amountsMatch(totals.debit, totals.credit)) {
      throw new BadRequestException('Journal voucher debit and credit totals must balance before posting.');
    }
  }

  private validateLineCount(lines: Array<{ lineNumber: number }>) {
    if (lines.length < 2) {
      throw new BadRequestException('Add at least two journal voucher entry rows.');
    }
  }

  private validateLineNumbers(lines: Array<{ lineNumber: number }>) {
    const lineNumbers = new Set<number>();

    for (const line of lines) {
      if (lineNumbers.has(line.lineNumber)) {
        throw new BadRequestException(`Duplicate journal voucher line number: ${line.lineNumber}.`);
      }

      lineNumbers.add(line.lineNumber);
    }
  }

  private validateLineAmounts(line: { lineNumber: number; debit: number | string | Prisma.Decimal; credit: number | string | Prisma.Decimal }) {
    const debit = Number(line.debit || 0);
    const credit = Number(line.credit || 0);

    if (!Number.isFinite(debit) || !Number.isFinite(credit) || debit < 0 || credit < 0) {
      throw new BadRequestException(`Journal line ${line.lineNumber} amounts must be valid non-negative numbers.`);
    }

    if (debit > 0 && credit > 0) {
      throw new BadRequestException(`Journal line ${line.lineNumber} cannot have both debit and credit.`);
    }

    if (debit <= 0 && credit <= 0) {
      throw new BadRequestException(`Journal line ${line.lineNumber} must have either debit or credit.`);
    }
  }
}
