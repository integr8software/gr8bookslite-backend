import { BadRequestException } from '@nestjs/common';
import { AccountsPayableVoucherStatus, Prisma } from '@prisma/client';
import { CompanyCurrencyService } from '../../../common/currency/company-currency.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { AccountsPayableVoucherService } from './accounts-payable-voucher.service';
import { AccountsPayableVoucherAccountingService } from './services/accounts-payable-voucher-accounting.service';

type AccountsPayableVoucherServiceInternals = {
  ensureStatusTransitionAllowed: (currentStatus: AccountsPayableVoucherStatus, targetStatus: AccountsPayableVoucherStatus) => void;
  getJournalEntryStatus: (status: AccountsPayableVoucherStatus) => string;
  resolveNextJournalEntryNo: (tx: Prisma.TransactionClient, companyId: number) => Promise<bigint>;
};

describe('AccountsPayableVoucherService', () => {
  const service = new AccountsPayableVoucherService(
    {} as PrismaService,
    {} as CompanyCurrencyService,
    {} as AccountsPayableVoucherAccountingService,
  ) as unknown as AccountsPayableVoucherServiceInternals;

  it('allows only APV lifecycle transitions supported by the workflow', () => {
    const allowedTransitions: Array<[AccountsPayableVoucherStatus, AccountsPayableVoucherStatus]> = [
      [AccountsPayableVoucherStatus.DRAFT, AccountsPayableVoucherStatus.APPROVED],
      [AccountsPayableVoucherStatus.DRAFT, AccountsPayableVoucherStatus.CANCELLED],
      [AccountsPayableVoucherStatus.DRAFT, AccountsPayableVoucherStatus.DISAPPROVED],
      [AccountsPayableVoucherStatus.APPROVED, AccountsPayableVoucherStatus.DRAFT],
      [AccountsPayableVoucherStatus.APPROVED, AccountsPayableVoucherStatus.CLOSED],
      [AccountsPayableVoucherStatus.CANCELLED, AccountsPayableVoucherStatus.DRAFT],
      [AccountsPayableVoucherStatus.DISAPPROVED, AccountsPayableVoucherStatus.DRAFT],
    ];

    for (const [currentStatus, targetStatus] of allowedTransitions) {
      expect(() => service.ensureStatusTransitionAllowed(currentStatus, targetStatus)).not.toThrow();
    }

    expect(() => service.ensureStatusTransitionAllowed(AccountsPayableVoucherStatus.CLOSED, AccountsPayableVoucherStatus.DRAFT)).toThrow(
      BadRequestException,
    );
    expect(() => service.ensureStatusTransitionAllowed(AccountsPayableVoucherStatus.DISAPPROVED, AccountsPayableVoucherStatus.CLOSED)).toThrow(
      BadRequestException,
    );
  });

  it('maps APV statuses to journal entry statuses used by accounting', () => {
    expect(service.getJournalEntryStatus(AccountsPayableVoucherStatus.APPROVED)).toBe('For Approval');
    expect(service.getJournalEntryStatus(AccountsPayableVoucherStatus.CLOSED)).toBe('Posted');
    expect(service.getJournalEntryStatus(AccountsPayableVoucherStatus.DRAFT)).toBe('Draft');
    expect(service.getJournalEntryStatus(AccountsPayableVoucherStatus.DISAPPROVED)).toBe('Disapproved');
    expect(service.getJournalEntryStatus(AccountsPayableVoucherStatus.CANCELLED)).toBe('Cancelled');
  });

  it('locks journal-number allocation before reading the latest APV journal number', async () => {
    const executeRaw = jest.fn<Promise<number>, unknown[]>().mockResolvedValue(1);
    const aggregate = jest.fn<Promise<{ _max: { jeno: bigint | null } }>, [args: unknown]>().mockResolvedValue({ _max: { jeno: 41n } });
    const transaction = {
      $executeRaw: executeRaw,
      journalEntryHeader: { aggregate },
    } as unknown as Prisma.TransactionClient;

    const result = await service.resolveNextJournalEntryNo(transaction, 17);

    expect(result).toBe(42n);
    expect(executeRaw).toHaveBeenCalledTimes(1);
    expect(Array.from(executeRaw.mock.calls[0][0] as TemplateStringsArray)).toEqual(['SELECT pg_advisory_xact_lock(', ')']);
    expect(executeRaw.mock.calls[0][1]).toBe((7081n << 32n) + 17n);
    expect(aggregate).toHaveBeenCalledWith({
      where: { companyId: 17 },
      _max: { jeno: true },
    });
    expect(executeRaw.mock.invocationCallOrder[0]).toBeLessThan(aggregate.mock.invocationCallOrder[0]);
  });
});
