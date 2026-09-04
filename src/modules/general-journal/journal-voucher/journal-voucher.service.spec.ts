import { BadRequestException } from '@nestjs/common';
import { JournalVoucherStatus, Prisma } from '@prisma/client';
import { CompanyCurrencyService } from '../../../common/currency/company-currency.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { JournalVoucherService } from './journal-voucher.service';
import { JournalVoucherAccountingService } from './services/journal-voucher-accounting.service';

type JournalVoucherServiceInternals = {
  ensureStatusTransitionAllowed: (currentStatus: JournalVoucherStatus, targetStatus: JournalVoucherStatus) => void;
  getJournalEntryStatus: (status: JournalVoucherStatus) => string;
  resolveNextJournalEntryNo: (tx: Prisma.TransactionClient, companyId: number) => Promise<bigint>;
};

describe('JournalVoucherService', () => {
  const service = new JournalVoucherService(
    {} as PrismaService,
    {} as CompanyCurrencyService,
    {} as JournalVoucherAccountingService,
  ) as unknown as JournalVoucherServiceInternals;

  it('allows only JV lifecycle transitions supported by the workflow', () => {
    const allowedTransitions: Array<[JournalVoucherStatus, JournalVoucherStatus]> = [
      [JournalVoucherStatus.DRAFT, JournalVoucherStatus.CANCELLED],
      [JournalVoucherStatus.DRAFT, JournalVoucherStatus.FOR_APPROVAL],
      [JournalVoucherStatus.FOR_APPROVAL, JournalVoucherStatus.CANCELLED],
      [JournalVoucherStatus.FOR_APPROVAL, JournalVoucherStatus.DISAPPROVED],
      [JournalVoucherStatus.FOR_APPROVAL, JournalVoucherStatus.POSTED],
      [JournalVoucherStatus.POSTED, JournalVoucherStatus.FOR_APPROVAL],
      [JournalVoucherStatus.CANCELLED, JournalVoucherStatus.FOR_APPROVAL],
      [JournalVoucherStatus.DISAPPROVED, JournalVoucherStatus.FOR_APPROVAL],
    ];

    for (const [currentStatus, targetStatus] of allowedTransitions) {
      expect(() => service.ensureStatusTransitionAllowed(currentStatus, targetStatus)).not.toThrow();
    }

    expect(() => service.ensureStatusTransitionAllowed(JournalVoucherStatus.POSTED, JournalVoucherStatus.DRAFT)).toThrow(BadRequestException);
    expect(() => service.ensureStatusTransitionAllowed(JournalVoucherStatus.CANCELLED, JournalVoucherStatus.POSTED)).toThrow(BadRequestException);
  });

  it('maps persisted JV statuses to journal entry status labels', () => {
    expect(service.getJournalEntryStatus(JournalVoucherStatus.DRAFT)).toBe('Draft');
    expect(service.getJournalEntryStatus(JournalVoucherStatus.FOR_APPROVAL)).toBe('For Approval');
    expect(service.getJournalEntryStatus(JournalVoucherStatus.POSTED)).toBe('Posted');
    expect(service.getJournalEntryStatus(JournalVoucherStatus.DISAPPROVED)).toBe('Disapproved');
    expect(service.getJournalEntryStatus(JournalVoucherStatus.CANCELLED)).toBe('Cancelled');
  });

  it('locks journal-number allocation before reading the latest JV journal number', async () => {
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
    expect(executeRaw.mock.calls[0][1]).toBe((7082n << 32n) + 17n);
    expect(aggregate).toHaveBeenCalledWith({
      where: { companyId: 17 },
      _max: { jeno: true },
    });
    expect(executeRaw.mock.invocationCallOrder[0]).toBeLessThan(aggregate.mock.invocationCallOrder[0]);
  });
});
