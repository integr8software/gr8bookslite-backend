import { CashVoucherStatus, Prisma } from '@prisma/client';
import { CompanyCurrencyService } from '../../../common/currency/company-currency.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { AccountsPayableVoucherCopySourceService } from '../../accounts-payable/accounts-payable-voucher/copy-from/accounts-payable-voucher-copy-source.service';
import { JournalVoucherCopySourceService } from '../../general-journal/journal-voucher/copy-from/journal-voucher-copy-source.service';
import { AdvanceToSupplierCopySourceService } from '../advances-to-suppliers/copy-from/advance-to-supplier-copy-source.service';
import { CashAdvanceCopySourceService } from '../cash-advance/copy-from/cash-advance-copy-source.service';
import { PettyCashReplenishmentCopySourceService } from '../petty-cash-replenishment/copy-from/petty-cash-replenishment-copy-source.service';
import { RevolvingFundReplenishmentCopySourceService } from '../revolving-fund-replenishment/copy-from/revolving-fund-replenishment-copy-source.service';
import { CashVoucherService } from './cash-voucher.service';
import { CashVoucherAccountingService } from './services/cash-voucher-accounting.service';

describe('CashVoucherService', () => {
  it('keeps submitted cash vouchers for approval when CV has an active approval workflow', async () => {
    const service = createService({
      approvalRule: {
        findFirst: jest.fn().mockResolvedValue({ id: 'approval-rule-1' }),
      },
    });
    const serviceInternals = service as unknown as {
      resolveApprovalAwareSubmissionStatus: (companyId: number, requestedStatus: CashVoucherStatus) => Promise<CashVoucherStatus>;
    };

    await expect(serviceInternals.resolveApprovalAwareSubmissionStatus(17, CashVoucherStatus.FOR_APPROVAL)).resolves.toBe(CashVoucherStatus.FOR_APPROVAL);
  });

  it('posts submitted cash vouchers when CV has no active approval workflow', async () => {
    const service = createService({
      approvalRule: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    });
    const serviceInternals = service as unknown as {
      resolveApprovalAwareSubmissionStatus: (companyId: number, requestedStatus: CashVoucherStatus) => Promise<CashVoucherStatus>;
    };

    await expect(serviceInternals.resolveApprovalAwareSubmissionStatus(17, CashVoucherStatus.FOR_APPROVAL)).resolves.toBe(CashVoucherStatus.POSTED);
  });

  it('does not alter draft status while checking approval-aware submission status', async () => {
    const approvalRuleFindFirst = jest.fn();
    const service = createService({
      approvalRule: {
        findFirst: approvalRuleFindFirst,
      },
    });
    const serviceInternals = service as unknown as {
      resolveApprovalAwareSubmissionStatus: (companyId: number, requestedStatus: CashVoucherStatus) => Promise<CashVoucherStatus>;
    };

    await expect(serviceInternals.resolveApprovalAwareSubmissionStatus(17, CashVoucherStatus.DRAFT)).resolves.toBe(CashVoucherStatus.DRAFT);
    expect(approvalRuleFindFirst).not.toHaveBeenCalled();
  });

  it.each([
    [CashVoucherStatus.DRAFT, 'Draft'],
    [CashVoucherStatus.FOR_APPROVAL, 'For Approval'],
    [CashVoucherStatus.POSTED, 'Posted'],
    [CashVoucherStatus.DISAPPROVED, 'Disapproved'],
    [CashVoucherStatus.CANCELLED, 'Cancelled'],
  ])('maps %s to the journal entry header status %s', (status, expected) => {
    const service = createService();
    const serviceInternals = service as unknown as {
      getJournalEntryStatus: (status: CashVoucherStatus) => string;
    };

    expect(serviceInternals.getJournalEntryStatus(status)).toBe(expected);
  });

  it('locks journal-number allocation with a parameterized query before reading the latest number', async () => {
    let executedQuery: Prisma.Sql | undefined;
    const executeRaw = jest.fn((query: Prisma.Sql): Promise<number> => {
      executedQuery = query;
      return Promise.resolve(1);
    });
    const findFirst = jest.fn<Promise<{ jeno: bigint } | null>, [args: unknown]>().mockResolvedValue({ jeno: 41n });
    const service = createService();
    const serviceInternals = service as unknown as {
      allocateJournalEntryNumber: (tx: Prisma.TransactionClient, companyId: number) => Promise<bigint>;
    };

    const transaction = {
      $executeRaw: executeRaw,
      journalEntryHeader: { findFirst },
    } as unknown as Prisma.TransactionClient;
    const result = await serviceInternals.allocateJournalEntryNumber(transaction, 17);

    expect(result).toBe(42n);
    expect(executeRaw).toHaveBeenCalledTimes(1);
    expect(executedQuery).toEqual(
      expect.objectContaining({
        strings: ['SELECT pg_advisory_xact_lock(', '::int, ', '::int)'],
        values: [7082, 17],
      }),
    );
    expect(findFirst).toHaveBeenCalledWith({
      where: { companyId: 17 },
      orderBy: { jeno: 'desc' },
      select: { jeno: true },
    });
    expect(executeRaw.mock.invocationCallOrder[0]).toBeLessThan(findFirst.mock.invocationCallOrder[0]);
  });
});

function createService(prisma: Record<string, unknown> = {}) {
  return new CashVoucherService(
    prisma as unknown as PrismaService,
    {} as CompanyCurrencyService,
    {} as CashVoucherAccountingService,
    {} as AccountsPayableVoucherCopySourceService,
    {} as AdvanceToSupplierCopySourceService,
    {} as CashAdvanceCopySourceService,
    {} as JournalVoucherCopySourceService,
    {} as PettyCashReplenishmentCopySourceService,
    {} as RevolvingFundReplenishmentCopySourceService,
  );
}
