import { BadRequestException } from '@nestjs/common';
import type { AccountsPayableVoucherDetails } from '@prisma/client';
import type { AccountsPayableVoucherDetailsDto } from '../dto/accounts-payable-voucher-details.dto';
import type { JournalEntryDto } from '../dto/journal-entry.dto';
import type { AccountsPayableVoucherJournalEntry } from '../types/accounts-payable-voucher-with-details.type';
import { AccountsPayableVoucherAccountingService } from './accounts-payable-voucher-accounting.service';

describe('AccountsPayableVoucherAccountingService', () => {
  let service: AccountsPayableVoucherAccountingService;

  beforeEach(() => {
    service = new AccountsPayableVoucherAccountingService();
  });

  describe('validateSubmittedPayload', () => {
    const createValidDetail = (overrides: Partial<AccountsPayableVoucherDetailsDto> = {}): AccountsPayableVoucherDetailsDto =>
      ({
        lineNumber: 1,
        expenseAccountCode: '5010101001',
        expenseType: 'Office Supplies',
        currencyCode: 'PHP',
        exchangeRate: 1,
        amount: 1000,
        netAmount: 1000,
        totalAmountDue: 1000,
        ...overrides,
      }) as AccountsPayableVoucherDetailsDto;

    const createValidJournal = (overrides: Partial<JournalEntryDto> = {}): JournalEntryDto =>
      ({
        lineNumber: 1,
        referenceType: 'APV',
        accountCode: '5010101001',
        accountTitle: 'Office Supplies Expense',
        currencyCode: 'PHP',
        exchangeRate: 1,
        debit: 1000,
        credit: 0,
        ...overrides,
      }) as JournalEntryDto;

    it('returns calculated totals when submitted payload is valid', () => {
      const details = [createValidDetail({ lineNumber: 1, amount: 1000, totalAmountDue: 1000 })];
      const journalEntries = [
        createValidJournal({ lineNumber: 1, debit: 1000, credit: 0 }),
        createValidJournal({ lineNumber: 2, accountCode: '2010101001', debit: 0, credit: 1000 }),
      ];

      const result = service.validateSubmittedPayload({
        currencyCode: 'PHP',
        details,
        exchangeRate: 1,
        journalEntries,
        voucherAmount: 1000,
      });

      expect(result).toEqual({
        detailGrossAmount: 1000,
        detailTotalAmountDue: 1000,
        totalCredit: 1000,
        totalDebit: 1000,
      });
    });

    it('throws BadRequestException when details array is empty', () => {
      expect(() =>
        service.validateSubmittedPayload({
          currencyCode: 'PHP',
          details: [],
          exchangeRate: 1,
          journalEntries: [
            createValidJournal({ lineNumber: 1, debit: 1000, credit: 0 }),
            createValidJournal({ lineNumber: 2, debit: 0, credit: 1000 }),
          ],
          voucherAmount: 1000,
        }),
      ).toThrow(new BadRequestException('Add at least one APV detail row.'));
    });

    it('throws BadRequestException when detail amount is zero or negative', () => {
      const details = [createValidDetail({ lineNumber: 1, amount: 0, totalAmountDue: 0 })];
      expect(() =>
        service.validateSubmittedPayload({
          currencyCode: 'PHP',
          details,
          exchangeRate: 1,
          journalEntries: [
            createValidJournal({ lineNumber: 1, debit: 1000, credit: 0 }),
            createValidJournal({ lineNumber: 2, debit: 0, credit: 1000 }),
          ],
          voucherAmount: 1000,
        }),
      ).toThrow(new BadRequestException('Detail line 1 amount must be non-zero.'));
    });

    it('throws BadRequestException when detail currency does not match voucher currency', () => {
      const details = [createValidDetail({ lineNumber: 1, currencyCode: 'USD' })];
      expect(() =>
        service.validateSubmittedPayload({
          currencyCode: 'PHP',
          details,
          exchangeRate: 1,
          journalEntries: [
            createValidJournal({ lineNumber: 1, debit: 1000, credit: 0 }),
            createValidJournal({ lineNumber: 2, debit: 0, credit: 1000 }),
          ],
          voucherAmount: 1000,
        }),
      ).toThrow(new BadRequestException('Detail line 1 currency must match the voucher currency.'));
    });

    it('throws BadRequestException when detail exchange rate does not match voucher exchange rate', () => {
      const details = [createValidDetail({ lineNumber: 1, exchangeRate: 56 })];
      expect(() =>
        service.validateSubmittedPayload({
          currencyCode: 'PHP',
          details,
          exchangeRate: 1,
          journalEntries: [
            createValidJournal({ lineNumber: 1, debit: 1000, credit: 0 }),
            createValidJournal({ lineNumber: 2, debit: 0, credit: 1000 }),
          ],
          voucherAmount: 1000,
        }),
      ).toThrow(new BadRequestException('Detail line 1 exchange rate must match the voucher exchange rate.'));
    });

    it('throws BadRequestException when journal entries count is less than two', () => {
      const details = [createValidDetail()];
      const journalEntries = [createValidJournal({ lineNumber: 1, debit: 1000, credit: 0 })];

      expect(() =>
        service.validateSubmittedPayload({
          currencyCode: 'PHP',
          details,
          exchangeRate: 1,
          journalEntries,
          voucherAmount: 1000,
        }),
      ).toThrow(new BadRequestException('Add at least two journal entry rows.'));
    });

    it('throws BadRequestException when journal entry has an invalid referenceType', () => {
      const details = [createValidDetail()];
      const journalEntries = [
        createValidJournal({ lineNumber: 1, referenceType: 'CV' as unknown as 'APV' }),
        createValidJournal({ lineNumber: 2, debit: 0, credit: 1000 }),
      ];

      expect(() =>
        service.validateSubmittedPayload({
          currencyCode: 'PHP',
          details,
          exchangeRate: 1,
          journalEntries,
          voucherAmount: 1000,
        }),
      ).toThrow(new BadRequestException('APV journal rows must use referenceType APV.'));
    });

    it('throws BadRequestException when a journal line has both debit and credit', () => {
      const details = [createValidDetail()];
      const journalEntries = [
        createValidJournal({ lineNumber: 1, debit: 500, credit: 500 }),
        createValidJournal({ lineNumber: 2, debit: 0, credit: 1000 }),
      ];

      expect(() =>
        service.validateSubmittedPayload({
          currencyCode: 'PHP',
          details,
          exchangeRate: 1,
          journalEntries,
          voucherAmount: 1000,
        }),
      ).toThrow(new BadRequestException('Journal line 1 cannot have both debit and credit.'));
    });

    it('throws BadRequestException when a journal line has neither debit nor credit', () => {
      const details = [createValidDetail()];
      const journalEntries = [
        createValidJournal({ lineNumber: 1, debit: 0, credit: 0 }),
        createValidJournal({ lineNumber: 2, debit: 0, credit: 1000 }),
      ];

      expect(() =>
        service.validateSubmittedPayload({
          currencyCode: 'PHP',
          details,
          exchangeRate: 1,
          journalEntries,
          voucherAmount: 1000,
        }),
      ).toThrow(new BadRequestException('Journal line 1 must have either debit or credit.'));
    });

    it('throws BadRequestException when journal currency does not match voucher currency', () => {
      const details = [createValidDetail()];
      const journalEntries = [
        createValidJournal({ lineNumber: 1, currencyCode: 'USD', debit: 1000, credit: 0 }),
        createValidJournal({ lineNumber: 2, debit: 0, credit: 1000 }),
      ];

      expect(() =>
        service.validateSubmittedPayload({
          currencyCode: 'PHP',
          details,
          exchangeRate: 1,
          journalEntries,
          voucherAmount: 1000,
        }),
      ).toThrow(new BadRequestException('Journal line 1 currency must match the voucher currency.'));
    });

    it('throws BadRequestException when journal exchange rate does not match voucher exchange rate', () => {
      const details = [createValidDetail()];
      const journalEntries = [
        createValidJournal({ lineNumber: 1, exchangeRate: 55, debit: 1000, credit: 0 }),
        createValidJournal({ lineNumber: 2, debit: 0, credit: 1000 }),
      ];

      expect(() =>
        service.validateSubmittedPayload({
          currencyCode: 'PHP',
          details,
          exchangeRate: 1,
          journalEntries,
          voucherAmount: 1000,
        }),
      ).toThrow(new BadRequestException('Journal line 1 exchange rate must match the voucher exchange rate.'));
    });

    it('throws BadRequestException when detail totalAmountDue does not match voucherAmount', () => {
      const details = [createValidDetail({ amount: 1000, totalAmountDue: 800 })];
      const journalEntries = [
        createValidJournal({ lineNumber: 1, debit: 1000, credit: 0 }),
        createValidJournal({ lineNumber: 2, debit: 0, credit: 1000 }),
      ];

      expect(() =>
        service.validateSubmittedPayload({
          currencyCode: 'PHP',
          details,
          exchangeRate: 1,
          journalEntries,
          voucherAmount: 1000,
        }),
      ).toThrow(new BadRequestException('Detail total due must match voucher amount.'));
    });

    it('throws BadRequestException when journal debit and credit do not balance', () => {
      const details = [createValidDetail({ amount: 1000, totalAmountDue: 1000 })];
      const journalEntries = [
        createValidJournal({ lineNumber: 1, debit: 1000, credit: 0 }),
        createValidJournal({ lineNumber: 2, debit: 0, credit: 900 }),
      ];

      expect(() =>
        service.validateSubmittedPayload({
          currencyCode: 'PHP',
          details,
          exchangeRate: 1,
          journalEntries,
          voucherAmount: 1000,
        }),
      ).toThrow(new BadRequestException('Journal entry debit and credit totals must balance.'));
    });

    it('throws BadRequestException when journal totals do not match detail gross amount', () => {
      const details = [createValidDetail({ amount: 1000, totalAmountDue: 1000 })];
      const journalEntries = [
        createValidJournal({ lineNumber: 1, debit: 1200, credit: 0 }),
        createValidJournal({ lineNumber: 2, debit: 0, credit: 1200 }),
      ];

      expect(() =>
        service.validateSubmittedPayload({
          currencyCode: 'PHP',
          details,
          exchangeRate: 1,
          journalEntries,
          voucherAmount: 1000,
        }),
      ).toThrow(new BadRequestException('Journal entry totals must match the APV detail gross amount.'));
    });
  });

  describe('validatePersistedPayload', () => {
    const createPersistedDetail = (overrides: Partial<AccountsPayableVoucherDetails> = {}): AccountsPayableVoucherDetails =>
      ({
        id: 1n,
        companyId: 1,
        apvId: 10n,
        lineNumber: 1,
        amount: 1500 as unknown as AccountsPayableVoucherDetails['amount'],
        totalAmountDue: 1500 as unknown as AccountsPayableVoucherDetails['totalAmountDue'],
        ...overrides,
      }) as AccountsPayableVoucherDetails;

    const createPersistedJournal = (overrides: Partial<AccountsPayableVoucherJournalEntry> = {}): AccountsPayableVoucherJournalEntry =>
      ({
        id: 1n,
        companyId: 1,
        jeno: 100n,
        lineNumber: 1,
        referenceType: 'APV',
        debit: 1500 as unknown as AccountsPayableVoucherJournalEntry['debit'],
        credit: 0 as unknown as AccountsPayableVoucherJournalEntry['credit'],
        ...overrides,
      }) as AccountsPayableVoucherJournalEntry;

    it('passes validation when persisted details and journal entries match voucher amount and balance', () => {
      const details = [createPersistedDetail()];
      const journalEntries = [
        createPersistedJournal({ lineNumber: 1, debit: 1500 as never, credit: 0 as never }),
        createPersistedJournal({ lineNumber: 2, debit: 0 as never, credit: 1500 as never }),
      ];

      expect(() =>
        service.validatePersistedPayload({
          amount: 1500,
          details,
          journalEntries,
        }),
      ).not.toThrow();
    });

    it('throws BadRequestException if details array is empty', () => {
      expect(() =>
        service.validatePersistedPayload({
          amount: 1500,
          details: [],
          journalEntries: [
            createPersistedJournal({ lineNumber: 1, debit: 1500 as never, credit: 0 as never }),
            createPersistedJournal({ lineNumber: 2, debit: 0 as never, credit: 1500 as never }),
          ],
        }),
      ).toThrow(new BadRequestException('Add at least one APV detail row before approval.'));
    });

    it('throws BadRequestException if journal entries length is less than two', () => {
      expect(() =>
        service.validatePersistedPayload({
          amount: 1500,
          details: [createPersistedDetail()],
          journalEntries: [createPersistedJournal({ lineNumber: 1, debit: 1500 as never, credit: 0 as never })],
        }),
      ).toThrow(new BadRequestException('Add at least two journal entry rows before approval.'));
    });

    it('throws BadRequestException if detail amount is zero', () => {
      expect(() =>
        service.validatePersistedPayload({
          amount: 1500,
          details: [createPersistedDetail({ amount: 0 as never })],
          journalEntries: [
            createPersistedJournal({ lineNumber: 1, debit: 1500 as never, credit: 0 as never }),
            createPersistedJournal({ lineNumber: 2, debit: 0 as never, credit: 1500 as never }),
          ],
        }),
      ).toThrow(new BadRequestException('Detail row amount must be non-zero before approval.'));
    });

    it('throws BadRequestException if journal referenceType is not APV', () => {
      expect(() =>
        service.validatePersistedPayload({
          amount: 1500,
          details: [createPersistedDetail()],
          journalEntries: [
            createPersistedJournal({ lineNumber: 1, referenceType: 'CV', debit: 1500 as never, credit: 0 as never }),
            createPersistedJournal({ lineNumber: 2, debit: 0 as never, credit: 1500 as never }),
          ],
        }),
      ).toThrow(new BadRequestException('APV journal rows must use referenceType APV.'));
    });

    it('throws BadRequestException if journal entry has both positive debit and credit', () => {
      expect(() =>
        service.validatePersistedPayload({
          amount: 1500,
          details: [createPersistedDetail()],
          journalEntries: [
            createPersistedJournal({ lineNumber: 1, debit: 500 as never, credit: 500 as never }),
            createPersistedJournal({ lineNumber: 2, debit: 0 as never, credit: 1500 as never }),
          ],
        }),
      ).toThrow(new BadRequestException('Journal entry debit and credit cannot both be positive.'));
    });

    it('throws BadRequestException if journal entry has neither positive debit nor credit', () => {
      expect(() =>
        service.validatePersistedPayload({
          amount: 1500,
          details: [createPersistedDetail()],
          journalEntries: [
            createPersistedJournal({ lineNumber: 1, debit: 0 as never, credit: 0 as never }),
            createPersistedJournal({ lineNumber: 2, debit: 0 as never, credit: 1500 as never }),
          ],
        }),
      ).toThrow(new BadRequestException('Journal entry must have either debit or credit.'));
    });

    it('throws BadRequestException if detail total amount due does not match voucher amount', () => {
      expect(() =>
        service.validatePersistedPayload({
          amount: 2000,
          details: [createPersistedDetail({ totalAmountDue: 1500 as never })],
          journalEntries: [
            createPersistedJournal({ lineNumber: 1, debit: 1500 as never, credit: 0 as never }),
            createPersistedJournal({ lineNumber: 2, debit: 0 as never, credit: 1500 as never }),
          ],
        }),
      ).toThrow(new BadRequestException('Detail total due must match voucher amount before approval.'));
    });

    it('throws BadRequestException if journal debit and credit do not balance', () => {
      expect(() =>
        service.validatePersistedPayload({
          amount: 1500,
          details: [createPersistedDetail({ amount: 1500 as never, totalAmountDue: 1500 as never })],
          journalEntries: [
            createPersistedJournal({ lineNumber: 1, debit: 1500 as never, credit: 0 as never }),
            createPersistedJournal({ lineNumber: 2, debit: 0 as never, credit: 1400 as never }),
          ],
        }),
      ).toThrow(new BadRequestException('Journal entry debit and credit totals must balance before approval.'));
    });

    it('throws BadRequestException if journal totals do not match detail gross amount', () => {
      expect(() =>
        service.validatePersistedPayload({
          amount: 1500,
          details: [createPersistedDetail({ amount: 1500 as never, totalAmountDue: 1500 as never })],
          journalEntries: [
            createPersistedJournal({ lineNumber: 1, debit: 1600 as never, credit: 0 as never }),
            createPersistedJournal({ lineNumber: 2, debit: 0 as never, credit: 1600 as never }),
          ],
        }),
      ).toThrow(new BadRequestException('Journal entry totals must match APV detail gross amount before approval.'));
    });
  });
});
