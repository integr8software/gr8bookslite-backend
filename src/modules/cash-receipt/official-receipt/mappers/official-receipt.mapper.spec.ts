import { OfficialReceiptStatus } from '@prisma/client';
import { mapOfficialReceipt } from './official-receipt.mapper';
import type { OfficialReceiptWithDetails } from '../types/official-receipt-with-details.type';

describe('mapOfficialReceipt', () => {
  it('maps payment details, monetary values, and journal snapshots for the API', () => {
    const receipt = {
      billToNameSnapshot: 'Pacific Office Supplies Inc.',
      createdAt: new Date('2026-08-24T08:00:00.000Z'),
      createdByUserId: 7,
      currencyCode: 'PHP',
      deletedAt: null,
      discountAmount: 0,
      documentDate: new Date('2026-08-24T00:00:00.000Z'),
      dueDate: new Date('2026-08-24T00:00:00.000Z'),
      ewtAmount: 1_000,
      exchangeRate: 1,
      grossAmount: 50_000,
      id: 42n,
      journalEntries: [
        {
          accountCodeSnapshot: '10103001',
          accountId: 11n,
          accountTitleSnapshot: 'Cash in Bank',
          atcCode: null,
          credit: 0,
          currencyCode: 'PHP',
          debit: 49_000,
          exchangeRate: 1,
          id: 91n,
          lineNumber: 1,
          particulars: 'Collection received',
          partyCodeSnapshot: 'PM000001',
          partyNameSnapshot: 'Pacific Office Supplies Inc.',
          refNo: 'REF-001',
          referenceId: 42n,
          referenceNo: 'REF-001',
          referenceType: 'OR',
          responsibilityCenterId: null,
          responsibilityCenterSnapshot: null,
          vatType: null,
        },
      ],
      netAmount: 44_000,
      partyCodeSnapshot: 'PM000001',
      partyId: 15n,
      partyNameSnapshot: 'Pacific Office Supplies Inc.',
      payment: { name: 'InstaPay' },
      paymentId: 3n,
      receivableAccount: null,
      receivableAccountId: null,
      receiptNo: 'OR-2026-0006',
      referenceNo: 'REF-001',
      remarks: null,
      status: OfficialReceiptStatus.DRAFT,
      transactionNo: 'OR-2026-0006',
      updatedAt: new Date('2026-08-24T09:00:00.000Z'),
      updatedByUserId: 8,
      vatAmount: 6_000,
      wvatAmount: 0,
      details: [
        {
          branchUnitId: 1,
          companyId: 1,
          cwtCode: 'WC160',
          cwtPercent: 2,
          description: 'Service Revenue',
          discountAmount: 0,
          ewtAmount: 1_000,
          grossAmount: 50_000,
          id: 81n,
          lineNumber: 1,
          netAmount: 44_000,
          particulars: 'Collection received',
          partyCodeSnapshot: 'PM000001',
          partyNameSnapshot: 'Pacific Office Supplies Inc.',
          referenceNo: 'REF-001',
          responsibilityCenterId: null,
          responsibilityCenterSnapshot: null,
          totalReceived: 49_000,
          vatAmount: 6_000,
          vatPercent: 12,
          vatType: 'Output VAT (12%)',
          wvatAmount: 0,
        },
      ],
    } as unknown as OfficialReceiptWithDetails;

    const mapped = mapOfficialReceipt(
      receipt,
      new Map([
        [7, 'Creator User'],
        [8, 'Updater User'],
      ]),
    );

    expect(mapped).toMatchObject({
      createdBy: 'Creator User',
      customerCode: 'PM000001',
      customerName: 'Pacific Office Supplies Inc.',
      documentDate: '2026-08-24',
      grossAmount: 50_000,
      id: '42',
      paymentId: '3',
      paymentType: 'InstaPay',
      receivableAccountCode: '10103001',
      receivableAccountTitle: 'Cash in Bank',
      updatedBy: 'Updater User',
    });
    expect(mapped.details[0]).toMatchObject({
      cwtCode: 'WC160',
      id: '81',
      totalReceived: 49_000,
    });
    expect(mapped.journalEntries[0]).toMatchObject({
      accountId: '11',
      debit: 49_000,
      particulars: 'Collection received',
      referenceId: '42',
    });
  });
});
