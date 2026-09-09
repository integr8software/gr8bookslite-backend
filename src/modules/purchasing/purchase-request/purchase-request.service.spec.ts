import { BadRequestException } from '@nestjs/common';
import { ChartAccountStatus } from '@prisma/client';
import { describe, expect, it, jest } from '@jest/globals';
import { PurchaseRequestItemDto } from './dto/purchase-request-item.dto';
import { PurchaseRequestService } from './purchase-request.service';

type BuildItemData = (
  companyId: number,
  branchUnitId: number,
  items: PurchaseRequestItemDto[],
  purchaseType: string,
) => Promise<Array<Record<string, unknown>>>;

describe('PurchaseRequestService entry source handling', () => {
  function createService() {
    const findResponsibilityCenter: jest.MockedFunction<(args: unknown) => Promise<null>> = jest.fn();
    const findServiceMaintenance: jest.MockedFunction<(args: unknown) => Promise<{ id: bigint } | null>> = jest.fn();
    const prisma = {
      responsibilityCenter: { findFirst: findResponsibilityCenter },
      serviceMaintenance: { findFirst: findServiceMaintenance },
    };
    const service = new PurchaseRequestService(prisma as never);
    const purchaseRequestService = service as unknown as { buildItemData: BuildItemData };
    const buildItemData: BuildItemData = (companyId, branchUnitId, items, purchaseType) =>
      purchaseRequestService.buildItemData(companyId, branchUnitId, items, purchaseType);

    return { buildItemData, findServiceMaintenance };
  }

  it('stores the selected Service Maintenance ID and clears item-only fields for Services', async () => {
    const { buildItemData, findServiceMaintenance } = createService();
    findServiceMaintenance.mockResolvedValue({ id: 42n });

    const [entry] = await buildItemData(7, 3, [createItem({ itemId: 'local-item-1', serviceMaintenanceId: '42' })], 'Services');

    expect(findServiceMaintenance).toHaveBeenCalledWith({
      where: {
        id: 42n,
        companyId: 7,
        deletedAt: null,
        status: ChartAccountStatus.ACTIVE,
      },
    });
    expect(entry).toEqual(
      expect.objectContaining({
        itemId: null,
        serviceMaintenanceId: 42n,
        itemCode: 'ITEM-1',
        barcode: null,
        uom: null,
      }),
    );
  });

  it.each(['Goods', 'Assets'])('stores the Item ID and does not resolve a service for %s', async (purchaseType) => {
    const { buildItemData, findServiceMaintenance } = createService();

    const [entry] = await buildItemData(7, 3, [createItem({ itemId: 'local-item-1' })], purchaseType);

    expect(findServiceMaintenance).not.toHaveBeenCalled();
    expect(entry).toEqual(
      expect.objectContaining({
        itemId: 'local-item-1',
        serviceMaintenanceId: null,
        barcode: '123456',
        uom: 'PC',
      }),
    );
  });

  it('rejects a Service ID that is not active in the current company', async () => {
    const { buildItemData, findServiceMaintenance } = createService();
    findServiceMaintenance.mockResolvedValue(null);

    await expect(buildItemData(7, 3, [createItem({ serviceMaintenanceId: '99' })], 'Services')).rejects.toThrow(
      new BadRequestException('Select a valid service from Service Maintenance.'),
    );
  });
});

function createItem(overrides: Partial<PurchaseRequestItemDto> = {}): PurchaseRequestItemDto {
  return {
    itemCode: 'ITEM-1',
    barcode: '123456',
    description: 'Maintenance service',
    uom: 'PC',
    qty: 2,
    lotNo: 'LOT-1',
    cost: 100,
    ...overrides,
  };
}
