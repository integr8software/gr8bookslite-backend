import { BadRequestException } from '@nestjs/common';
import { BillingStatementStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { BillingStatementService } from './billing-statement.service';
import { BillingStatementAccountingService } from './services/billing-statement-accounting.service';

type BillingStatementServiceInternals = {
  ensureStatusTransitionAllowed: (currentStatus: BillingStatementStatus, targetStatus: BillingStatementStatus) => void;
  normalizeStatus: (status: string) => BillingStatementStatus;
  resolveNextJournalEntryNo: (tx: Prisma.TransactionClient, companyId: number) => Promise<bigint>;
};

describe('BillingStatementService', () => {
  const service = new BillingStatementService({} as PrismaService, {} as BillingStatementAccountingService) as unknown as BillingStatementServiceInternals;

  it('allows only billing statement lifecycle transitions supported by the workflow', () => {
    const allowedTransitions: Array<[BillingStatementStatus, BillingStatementStatus]> = [
      [BillingStatementStatus.DRAFT, BillingStatementStatus.CANCELLED],
      [BillingStatementStatus.DRAFT, BillingStatementStatus.DISAPPROVED],
      [BillingStatementStatus.DRAFT, BillingStatementStatus.FOR_APPROVAL],
      [BillingStatementStatus.FOR_APPROVAL, BillingStatementStatus.CANCELLED],
      [BillingStatementStatus.FOR_APPROVAL, BillingStatementStatus.DISAPPROVED],
      [BillingStatementStatus.FOR_APPROVAL, BillingStatementStatus.POSTED],
      [BillingStatementStatus.DISAPPROVED, BillingStatementStatus.DRAFT],
    ];

    for (const [currentStatus, targetStatus] of allowedTransitions) {
      expect(() => service.ensureStatusTransitionAllowed(currentStatus, targetStatus)).not.toThrow();
    }

    expect(() => service.ensureStatusTransitionAllowed(BillingStatementStatus.POSTED, BillingStatementStatus.DRAFT)).toThrow(BadRequestException);
    expect(() => service.ensureStatusTransitionAllowed(BillingStatementStatus.CANCELLED, BillingStatementStatus.FOR_APPROVAL)).toThrow(BadRequestException);
  });

  it('normalizes UI status labels into persisted billing statement statuses', () => {
    expect(service.normalizeStatus('for approval')).toBe(BillingStatementStatus.FOR_APPROVAL);
    expect(service.normalizeStatus('For-Approval')).toBe(BillingStatementStatus.FOR_APPROVAL);
    expect(service.normalizeStatus('posted')).toBe(BillingStatementStatus.POSTED);
    expect(() => service.normalizeStatus('approved')).toThrow(BadRequestException);
  });

  it('locks journal-number allocation before reading the latest billing statement journal number', async () => {
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
