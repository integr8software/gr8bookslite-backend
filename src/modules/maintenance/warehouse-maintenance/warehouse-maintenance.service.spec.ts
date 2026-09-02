import { BadRequestException } from '@nestjs/common';
import { WarehouseBranchAvailabilityMode } from '@prisma/client';
import { WarehouseMaintenanceService } from './warehouse-maintenance.service';

describe('WarehouseMaintenanceService branch ownership', () => {
  function createService() {
    const prisma = {
      companyUnit: {
        findMany: jest.fn(),
      },
    };

    return { prisma, service: new WarehouseMaintenanceService(prisma as never) };
  }

  it('resolves unique active branches owned by the company', async () => {
    const { prisma, service } = createService();
    prisma.companyUnit.findMany.mockResolvedValue([{ id: 101 }, { id: 102 }]);

    await expect(callPrivate(service, 'resolveBranchUnitIds', 11, [101, 102, 101], WarehouseBranchAvailabilityMode.SPECIFIC)).resolves.toEqual([101, 102]);
    expect(prisma.companyUnit.findMany).toHaveBeenCalledWith({
      where: { id: { in: [101, 102] }, companyId: 11, isActive: true },
      select: { id: true },
    });
  });

  it('rejects branches outside the active company catalog', async () => {
    const { prisma, service } = createService();
    prisma.companyUnit.findMany.mockResolvedValue([{ id: 101 }]);

    await expect(callPrivate(service, 'resolveBranchUnitIds', 11, [101, 999], WarehouseBranchAvailabilityMode.SPECIFIC)).rejects.toThrow(BadRequestException);
  });
});

function callPrivate(service: WarehouseMaintenanceService, methodName: string, ...args: unknown[]) {
  return (service as never as Record<string, (...values: unknown[]) => Promise<unknown>>)[methodName](...args);
}
