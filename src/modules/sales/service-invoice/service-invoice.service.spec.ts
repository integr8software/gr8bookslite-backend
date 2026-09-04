import { BadRequestException } from '@nestjs/common';
import { Prisma, ServiceInvoiceStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { ServiceInvoiceService } from './service-invoice.service';
import { ServiceInvoiceAccountingService } from './services/service-invoice-accounting.service';

type ServiceInvoiceServiceInternals = {
  ensureStatusTransitionAllowed: (currentStatus: ServiceInvoiceStatus, targetStatus: ServiceInvoiceStatus) => void;
  normalizeStatus: (status: string) => ServiceInvoiceStatus;
  resolveNextJournalEntryNo: (tx: Prisma.TransactionClient, companyId: number) => Promise<bigint>;
};

describe('ServiceInvoiceService', () => {
  const service = new ServiceInvoiceService({} as PrismaService, {} as ServiceInvoiceAccountingService) as unknown as ServiceInvoiceServiceInternals;

  it('allows only service invoice lifecycle transitions supported by the workflow', () => {
    const allowedTransitions: Array<[ServiceInvoiceStatus, ServiceInvoiceStatus]> = [
      [ServiceInvoiceStatus.DRAFT, ServiceInvoiceStatus.CANCELLED],
      [ServiceInvoiceStatus.DRAFT, ServiceInvoiceStatus.DISAPPROVED],
      [ServiceInvoiceStatus.DRAFT, ServiceInvoiceStatus.FOR_APPROVAL],
      [ServiceInvoiceStatus.FOR_APPROVAL, ServiceInvoiceStatus.CANCELLED],
      [ServiceInvoiceStatus.FOR_APPROVAL, ServiceInvoiceStatus.DISAPPROVED],
      [ServiceInvoiceStatus.FOR_APPROVAL, ServiceInvoiceStatus.POSTED],
      [ServiceInvoiceStatus.DISAPPROVED, ServiceInvoiceStatus.DRAFT],
    ];

    for (const [currentStatus, targetStatus] of allowedTransitions) {
      expect(() => service.ensureStatusTransitionAllowed(currentStatus, targetStatus)).not.toThrow();
    }

    expect(() => service.ensureStatusTransitionAllowed(ServiceInvoiceStatus.POSTED, ServiceInvoiceStatus.DRAFT)).toThrow(BadRequestException);
    expect(() => service.ensureStatusTransitionAllowed(ServiceInvoiceStatus.CANCELLED, ServiceInvoiceStatus.FOR_APPROVAL)).toThrow(BadRequestException);
  });

  it('normalizes UI status labels into persisted service invoice statuses', () => {
    expect(service.normalizeStatus('for approval')).toBe(ServiceInvoiceStatus.FOR_APPROVAL);
    expect(service.normalizeStatus('For-Approval')).toBe(ServiceInvoiceStatus.FOR_APPROVAL);
    expect(service.normalizeStatus('posted')).toBe(ServiceInvoiceStatus.POSTED);
    expect(() => service.normalizeStatus('approved')).toThrow(BadRequestException);
  });

  it('locks journal-number allocation before reading the latest service invoice journal number', async () => {
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
