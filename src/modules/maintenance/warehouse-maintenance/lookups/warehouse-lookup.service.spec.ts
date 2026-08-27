import { WarehouseBranchAvailabilityMode, WarehouseStatus } from '@prisma/client';
import { WarehouseLookupService } from './warehouse-lookup.service';

describe('WarehouseLookupService', () => {
  it('combines branch visibility and search filters for active warehouses', async () => {
    const prisma = { warehouse: { findMany: jest.fn() } };
    const service = new WarehouseLookupService(prisma as never);
    prisma.warehouse.findMany.mockResolvedValue([{ id: 20n, code: 'MAIN', name: 'Main Warehouse', status: WarehouseStatus.ACTIVE }]);

    const result = await service.findOptions({ companyId: 11, branchUnitId: 4, search: ' main ' });

    expect(prisma.warehouse.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          companyId: 11,
          deletedAt: null,
          status: WarehouseStatus.ACTIVE,
          AND: [
            {
              OR: [
                { branchAvailabilityMode: WarehouseBranchAvailabilityMode.ALL },
                { branchAvailabilityMode: WarehouseBranchAvailabilityMode.SPECIFIC, branches: { some: { unitId: 4 } } },
                { branchAvailabilityMode: WarehouseBranchAvailabilityMode.EXCEPT, branches: { none: { unitId: 4 } } },
              ],
            },
            {
              OR: [{ code: { contains: 'main', mode: 'insensitive' } }, { name: { contains: 'main', mode: 'insensitive' } }],
            },
          ],
        }),
      }),
    );
    expect(result).toEqual([{ id: '20', code: 'MAIN', name: 'Main Warehouse', status: WarehouseStatus.ACTIVE }]);
  });
});
