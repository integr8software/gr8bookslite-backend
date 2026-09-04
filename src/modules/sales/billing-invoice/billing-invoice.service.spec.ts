import { BadRequestException } from '@nestjs/common';
import { BillingInvoiceStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { BillingInvoiceService } from './billing-invoice.service';
import { BillingInvoiceAccountingService } from './services/billing-invoice-accounting.service';

type BillingInvoiceServiceInternals = {
  ensureStatusTransitionAllowed: (currentStatus: BillingInvoiceStatus, targetStatus: BillingInvoiceStatus) => void;
  normalizeStatus: (status: string) => BillingInvoiceStatus;
  resolveNextJournalEntryNo: (tx: Prisma.TransactionClient, companyId: number) => Promise<bigint>;
};

describe('BillingInvoiceService', () => {
  const service = new BillingInvoiceService({} as PrismaService, {} as BillingInvoiceAccountingService) as unknown as BillingInvoiceServiceInternals;

  it('allows only billing invoice lifecycle transitions supported by the workflow', () => {
    const allowedTransitions: Array<[BillingInvoiceStatus, BillingInvoiceStatus]> = [
      [BillingInvoiceStatus.DRAFT, BillingInvoiceStatus.CANCELLED],
      [BillingInvoiceStatus.DRAFT, BillingInvoiceStatus.DISAPPROVED],
      [BillingInvoiceStatus.DRAFT, BillingInvoiceStatus.FOR_APPROVAL],
      [BillingInvoiceStatus.FOR_APPROVAL, BillingInvoiceStatus.CANCELLED],
      [BillingInvoiceStatus.FOR_APPROVAL, BillingInvoiceStatus.DISAPPROVED],
      [BillingInvoiceStatus.FOR_APPROVAL, BillingInvoiceStatus.POSTED],
      [BillingInvoiceStatus.DISAPPROVED, BillingInvoiceStatus.DRAFT],
    ];

    for (const [currentStatus, targetStatus] of allowedTransitions) {
      expect(() => service.ensureStatusTransitionAllowed(currentStatus, targetStatus)).not.toThrow();
    }

    expect(() => service.ensureStatusTransitionAllowed(BillingInvoiceStatus.POSTED, BillingInvoiceStatus.DRAFT)).toThrow(BadRequestException);
    expect(() => service.ensureStatusTransitionAllowed(BillingInvoiceStatus.CANCELLED, BillingInvoiceStatus.FOR_APPROVAL)).toThrow(BadRequestException);
  });

  it('normalizes UI status labels into persisted billing invoice statuses', () => {
    expect(service.normalizeStatus('for approval')).toBe(BillingInvoiceStatus.FOR_APPROVAL);
    expect(service.normalizeStatus('For-Approval')).toBe(BillingInvoiceStatus.FOR_APPROVAL);
    expect(service.normalizeStatus('posted')).toBe(BillingInvoiceStatus.POSTED);
    expect(() => service.normalizeStatus('approved')).toThrow(BadRequestException);
  });

  it('locks journal-number allocation before reading the latest billing invoice journal number', async () => {
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
