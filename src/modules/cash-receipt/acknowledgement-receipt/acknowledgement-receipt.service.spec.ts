import { BadRequestException } from '@nestjs/common';
import { PaymentTypeStatus } from '@prisma/client';
import type { PaymentType, Prisma } from '@prisma/client';
import type { AcknowledgementReceiptDetailDto } from './dto/acknowledgement-receipt-detail.dto';
import type { PrismaService } from '../../../prisma/prisma.service';
import { AcknowledgementReceiptService } from './acknowledgement-receipt.service';
import type { AcknowledgementReceiptAccountingService } from './services/acknowledgement-receipt-accounting.service';

describe('AcknowledgementReceiptService payment type resolution', () => {
  const findFirst = jest.fn();
  const prisma = {
    paymentType: { findFirst },
  } as unknown as PrismaService;
  const service = new AcknowledgementReceiptService(prisma, {} as AcknowledgementReceiptAccountingService);

  beforeEach(() => {
    findFirst.mockReset();
  });

  it('accepts an active payment type belonging to the receipt company', async () => {
    const paymentType = {
      companyId: 12,
      id: 31n,
      status: PaymentTypeStatus.ACTIVE,
    } as PaymentType;
    findFirst.mockResolvedValue(paymentType);

    await expect(service['resolvePaymentType'](prisma, 12, '31')).resolves.toBe(paymentType);
    expect(findFirst).toHaveBeenCalledWith({
      where: {
        companyId: 12,
        deletedAt: null,
        id: 31n,
        status: PaymentTypeStatus.ACTIVE,
      },
    });
  });

  it('keeps payment type optional when no payment ID is supplied', async () => {
    await expect(service['resolvePaymentType'](prisma, 12, null)).resolves.toBeNull();
    expect(findFirst).not.toHaveBeenCalled();
  });

  it('rejects a payment ID that does not reference an active company payment type', async () => {
    findFirst.mockResolvedValue(null);

    await expect(service['resolvePaymentType'](prisma, 12, '31')).rejects.toThrow(
      new BadRequestException('Payment type must reference an active company payment type.'),
    );
  });
});

describe('AcknowledgementReceiptService entry persistence', () => {
  const service = new AcknowledgementReceiptService({} as PrismaService, {} as AcknowledgementReceiptAccountingService);

  it('stores each collection item and its hidden columns in AcknowledgementReceiptDetails', async () => {
    const createMany = jest.fn().mockResolvedValue({ count: 1 });
    const tx = {
      acknowledgementReceiptDetails: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }), createMany },
    } as unknown as Prisma.TransactionClient;
    const input: AcknowledgementReceiptDetailDto = {
      lineNumber: 1,
      description: 'Service Revenue',
      partyCode: 'PM-1',
      partyName: 'Customer',
      particulars: 'Collection',
      referenceNo: 'REF-1',
      responsibilityCenter: 'Sales',
      vatType: 'Output VAT (12%)',
      vatPercent: 12,
      cwtCode: 'WC160',
      cwtPercent: 2,
      netAmount: 44000,
      vatAmount: 6000,
      ewtAmount: 1000,
      grossAmount: 50000,
      totalReceived: 49000,
    };

    await service['replaceDetails'](tx, 7n, 1, 2, [{ input, responsibilityCenter: null }]);

    expect(createMany).toHaveBeenCalledWith({
      data: [
        {
          acknowledgementReceiptId: 7n,
          companyId: 1,
          branchUnitId: 2,
          lineNumber: 1,
          description: 'Service Revenue',
          partyCodeSnapshot: 'PM-1',
          partyNameSnapshot: 'Customer',
          particulars: 'Collection',
          referenceNo: 'REF-1',
          responsibilityCenterId: null,
          responsibilityCenterSnapshot: 'Sales',
          vatType: 'Output VAT (12%)',
          vatPercent: 12,
          cwtCode: 'WC160',
          cwtPercent: 2,
          netAmount: 44000,
          vatAmount: 6000,
          ewtAmount: 1000,
          grossAmount: 50000,
          totalReceived: 49000,
        },
      ],
    });
  });

  it('stores accounting rows under JournalEntryHeader with nested JournalEntryDetail rows', async () => {
    const create = jest.fn<Promise<unknown>, [Prisma.JournalEntryHeaderCreateArgs]>().mockResolvedValue({});
    const deleteMany = jest.fn().mockResolvedValue({ count: 0 });
    const tx = {
      $executeRaw: jest.fn().mockResolvedValue(1),
      journalEntryHeader: { create, deleteMany, aggregate: jest.fn().mockResolvedValue({ _max: { jeno: 4n } }) },
    } as unknown as Prisma.TransactionClient;
    const journalEntries = [
      { debit: 500, credit: 0, accountCode: '1010103001', accountTitle: 'Cash in Bank' },
      { debit: 0, credit: 500, accountCode: '4020000001', accountTitle: 'Service Revenue' },
    ].map((entry, index) => ({
      account: null,
      responsibilityCenter: null,
      input: { ...entry, lineNumber: index + 1, currencyCode: 'PHP', exchangeRate: 1, partyCode: 'PM-1', partyName: 'Customer' },
    }));

    await service['replaceJournalEntries'](tx, 7n, 1, 2, 'PHP', 1, journalEntries);

    expect(deleteMany).toHaveBeenCalledWith({ where: { referenceId: 7n, referenceType: 'AR' } });
    expect(create).toHaveBeenCalledTimes(1);
    expect(create.mock.calls[0][0]).toMatchObject({
      data: {
        referenceId: 7n,
        referenceType: 'AR',
        companyId: 1,
        branchUnitId: 2,
        jeno: 5n,
        totalDebit: 500,
        totalCredit: 500,
        details: {
          create: [
            { lineNumber: 1, debit: 500, credit: 0, partyCodeSnapshot: 'PM-1' },
            { lineNumber: 2, debit: 0, credit: 500, partyNameSnapshot: 'Customer' },
          ],
        },
      },
    });
  });
});
