import { BadRequestException } from '@nestjs/common';
import { BillingStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { BillingService } from './billing.service';
import { BillingAccountingService } from './services/billing-accounting.service';

type BillingServiceInternals = {
  ensureStatusTransitionAllowed: (currentStatus: BillingStatus, targetStatus: BillingStatus) => void;
  normalizeStatus: (status: string) => BillingStatus;
  resolveNextJournalEntryNo: (tx: Prisma.TransactionClient, companyId: number) => Promise<bigint>;
};

describe('BillingService', () => {
  const service = new BillingService({} as PrismaService, {} as BillingAccountingService) as unknown as BillingServiceInternals;

  it('allows only billing lifecycle transitions supported by the workflow', () => {
    const allowedTransitions: Array<[BillingStatus, BillingStatus]> = [
      [BillingStatus.DRAFT, BillingStatus.CANCELLED],
      [BillingStatus.DRAFT, BillingStatus.DISAPPROVED],
      [BillingStatus.DRAFT, BillingStatus.FOR_APPROVAL],
      [BillingStatus.FOR_APPROVAL, BillingStatus.CANCELLED],
      [BillingStatus.FOR_APPROVAL, BillingStatus.DISAPPROVED],
      [BillingStatus.FOR_APPROVAL, BillingStatus.POSTED],
      [BillingStatus.DISAPPROVED, BillingStatus.DRAFT],
    ];

    for (const [currentStatus, targetStatus] of allowedTransitions) {
      expect(() => service.ensureStatusTransitionAllowed(currentStatus, targetStatus)).not.toThrow();
    }

    expect(() => service.ensureStatusTransitionAllowed(BillingStatus.POSTED, BillingStatus.DRAFT)).toThrow(BadRequestException);
    expect(() => service.ensureStatusTransitionAllowed(BillingStatus.CANCELLED, BillingStatus.FOR_APPROVAL)).toThrow(BadRequestException);
  });

  it('normalizes UI status labels into persisted billing statuses', () => {
    expect(service.normalizeStatus('for approval')).toBe(BillingStatus.FOR_APPROVAL);
    expect(service.normalizeStatus('For-Approval')).toBe(BillingStatus.FOR_APPROVAL);
    expect(service.normalizeStatus('posted')).toBe(BillingStatus.POSTED);
    expect(() => service.normalizeStatus('approved')).toThrow(BadRequestException);
  });

  it('locks journal-number allocation before reading the latest billing journal number', async () => {
    const executeRaw = jest.fn<Promise<number>, unknown[]>().mockResolvedValue(1);
    const aggregate = jest.fn<Promise<{ _max: { jeno: bigint | null } }>, [args: unknown]>().mockResolvedValue({ _max: { jeno: 7n } });
    const transaction = {
      $executeRaw: executeRaw,
      journalEntryHeader: { aggregate },
    } as unknown as Prisma.TransactionClient;

    await expect(service.resolveNextJournalEntryNo(transaction, 4)).resolves.toBe(8n);
    expect(executeRaw.mock.calls[0][1]).toBe((9081n << 32n) + 4n);
    expect(executeRaw.mock.invocationCallOrder[0]).toBeLessThan(aggregate.mock.invocationCallOrder[0]);
  });
});
