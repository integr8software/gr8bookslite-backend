import { Prisma } from '@prisma/client';
import { CompanyCurrencyService } from '../../../common/currency/company-currency.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { AccountsPayableVoucherCopySourceService } from '../../accounts-payable/accounts-payable-voucher/copy-from/accounts-payable-voucher-copy-source.service';
import { AdvanceToSupplierCopySourceService } from '../advances-to-suppliers/copy-from/advance-to-supplier-copy-source.service';
import { PettyCashReplenishmentCopySourceService } from '../petty-cash-replenishment/copy-from/petty-cash-replenishment-copy-source.service';
import { RevolvingFundReplenishmentCopySourceService } from '../revolving-fund-replenishment/copy-from/revolving-fund-replenishment-copy-source.service';
import { DisbursementVoucherService } from './disbursement-voucher.service';
import { DisbursementVoucherAccountingService } from './services/disbursement-voucher-accounting.service';

describe('DisbursementVoucherService', () => {
  it('locks journal-number allocation with a parameterized query before reading the latest number', async () => {
    let executedQuery: Prisma.Sql | undefined;
    const executeRaw = jest.fn((query: Prisma.Sql): Promise<number> => {
      executedQuery = query;
      return Promise.resolve(1);
    });
    const findFirst = jest.fn<Promise<{ jeno: bigint } | null>, [args: unknown]>().mockResolvedValue({ jeno: 41n });
    const service = new DisbursementVoucherService(
      {} as PrismaService,
      {} as CompanyCurrencyService,
      {} as DisbursementVoucherAccountingService,
      {} as AccountsPayableVoucherCopySourceService,
      {} as AdvanceToSupplierCopySourceService,
      {} as PettyCashReplenishmentCopySourceService,
      {} as RevolvingFundReplenishmentCopySourceService,
    );
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
