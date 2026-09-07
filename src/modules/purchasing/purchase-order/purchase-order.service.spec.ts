import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, jest } from '@jest/globals';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { PurchaseOrderItemDto } from './dto/purchase-order-item.dto';
import { PurchaseOrderService } from './purchase-order.service';

type BuildEntries = (
  companyId: number,
  branchUnitId: number,
  items: PurchaseOrderItemDto[],
  purchaseType: string,
  purchaseRequestId?: bigint,
) => Promise<Array<Record<string, unknown>>>;

type ResolveReferences = (
  companyId: number,
  dto: CreatePurchaseOrderDto,
) => Promise<{ term: { id: bigint; name: string } | null; purchaseType: string }>;

describe('PurchaseOrderService business logic', () => {
  function createService() {
    const purchaseRequestEntryFindFirst = jest.fn<(args: unknown) => Promise<{ id: bigint } | null>>();
    const responsibilityCenterFindFirst = jest.fn<(args: unknown) => Promise<{ id: bigint; name: string } | null>>();
    const serviceMaintenanceFindFirst = jest.fn<(args: unknown) => Promise<{ id: bigint } | null>>();
    const termFindFirst = jest.fn<(args: unknown) => Promise<{ id: bigint; name: string } | null>>();
    const partyFindFirst = jest.fn<(args: unknown) => Promise<Record<string, unknown> | null>>();
    const purchaseRequestFindFirst = jest.fn<(args: unknown) => Promise<{ id: bigint } | null>>();
    const prisma = {
      purchaseRequestEntry: { findFirst: purchaseRequestEntryFindFirst },
      responsibilityCenter: { findFirst: responsibilityCenterFindFirst },
      serviceMaintenance: { findFirst: serviceMaintenanceFindFirst },
      term: { findFirst: termFindFirst },
      party: { findFirst: partyFindFirst },
      purchaseRequest: { findFirst: purchaseRequestFindFirst },
    };
    const service = new PurchaseOrderService(prisma as never) as unknown as {
      entries: BuildEntries;
      resolveReferences: ResolveReferences;
    };

    return {
      buildEntries: service.entries.bind(service),
      resolveReferences: service.resolveReferences.bind(service),
      partyFindFirst,
      purchaseRequestEntryFindFirst,
      responsibilityCenterFindFirst,
      serviceMaintenanceFindFirst,
      termFindFirst,
    };
  }

  it('calculates percentage discount and exclusive VAT totals on the server', async () => {
    const { buildEntries } = createService();
    const [entry] = await buildEntries(7, 3, [createItem({ poQty: 2, price: 100, discountRate: 10, vatAmount: 21.6 })], 'Goods');

    expect(Number(entry.grossAmount)).toBe(200);
    expect(Number(entry.discountAmount)).toBe(20);
    expect(Number(entry.grossAfterDiscount)).toBe(180);
    expect(Number(entry.netOfVatAmount)).toBe(180);
    expect(Number(entry.netAmount)).toBe(201.6);
  });

  it('subtracts VAT from net-of-VAT while preserving an inclusive line total', async () => {
    const { buildEntries } = createService();
    const [entry] = await buildEntries(7, 3, [createItem({ poQty: 2, price: 100, discountAmount: 20, vatAmount: 19.29, vatInclusive: true })], 'Services');

    expect(Number(entry.grossAfterDiscount)).toBe(180);
    expect(Number(entry.netOfVatAmount)).toBeCloseTo(160.71);
    expect(Number(entry.netAmount)).toBe(180);
  });

  it('accepts a free-text payment term snapshot without inventing a foreign key', async () => {
    const { partyFindFirst, resolveReferences, termFindFirst } = createService();
    partyFindFirst.mockResolvedValue({ id: 2n, partyCodeNo: 'PM-000002' });
    termFindFirst.mockResolvedValue(null);

    const references = await resolveReferences(7, createOrder({ termsOfPayment: 'Net 15' }));

    expect(references.term).toBeNull();
    expect(termFindFirst).toHaveBeenCalledWith({
      where: {
        companyId: 7,
        deletedAt: null,
        name: { equals: 'Net 15', mode: 'insensitive' },
      },
    });
  });

  it('rejects an explicit payment term ID that does not belong to the company', async () => {
    const { partyFindFirst, resolveReferences, termFindFirst } = createService();
    partyFindFirst.mockResolvedValue({ id: 2n, partyCodeNo: 'PM-000002' });
    termFindFirst.mockResolvedValue(null);

    await expect(resolveReferences(7, createOrder({ termId: '99' }))).rejects.toThrow(
      new BadRequestException('Select valid Terms of Payment from maintenance.'),
    );
  });

  it('requires a copied purchase-request entry to belong to the selected request and company', async () => {
    const { buildEntries, purchaseRequestEntryFindFirst } = createService();
    purchaseRequestEntryFindFirst.mockResolvedValue(null);

    await expect(buildEntries(7, 3, [createItem({ purchaseRequestEntryId: '42' })], 'Goods', 9n)).rejects.toThrow(
      new BadRequestException('Select a valid Purchase Request entry.'),
    );
    expect(purchaseRequestEntryFindFirst).toHaveBeenCalledWith({
      where: { id: 42n, companyId: 7, purchaseRequestId: 9n },
    });
  });

  it('stores valid service and responsibility-center foreign keys', async () => {
    const { buildEntries, responsibilityCenterFindFirst, serviceMaintenanceFindFirst } = createService();
    responsibilityCenterFindFirst.mockResolvedValue({ id: 12n, name: 'Operations' });
    serviceMaintenanceFindFirst.mockResolvedValue({ id: 15n });

    const [entry] = await buildEntries(
      7,
      3,
      [createItem({ responsibilityCenterId: '12', serviceMaintenanceId: '15' })],
      'Services',
    );

    expect(entry).toEqual(
      expect.objectContaining({
        responsibilityCenterId: 12n,
        responsibilityCenterName: 'Operations',
        serviceMaintenanceId: 15n,
      }),
    );
  });
});

function createItem(overrides: Partial<PurchaseOrderItemDto> = {}): PurchaseOrderItemDto {
  return {
    description: 'Office supplies',
    prQty: 2,
    poQty: 1,
    price: 100,
    ...overrides,
  };
}

function createOrder(overrides: Partial<CreatePurchaseOrderDto> = {}): CreatePurchaseOrderDto {
  return {
    transNo: 'PO-2026-0001',
    poDate: '2026-09-04',
    partyCode: 'PM-000002',
    purchaseType: 'Goods',
    items: [createItem()],
    ...overrides,
  };
}
