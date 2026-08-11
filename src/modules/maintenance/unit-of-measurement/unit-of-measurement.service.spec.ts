import { BadRequestException } from '@nestjs/common';
import { UnitOfMeasurementQuantityMode, UnitOfMeasurementStatus } from '@prisma/client';
import { AppRole } from '../../../common/enums/app-role.enum';
import { UnitOfMeasurementService } from './unit-of-measurement.service';

describe('UnitOfMeasurementService unit options', () => {
  function createService() {
    const prisma = {
      unitOfMeasurement: {
        findMany: jest.fn(),
      },
    };

    return { prisma, service: new UnitOfMeasurementService(prisma as never) };
  }

  it('returns active fractional units matching a normalized search', async () => {
    const { prisma, service } = createService();
    prisma.unitOfMeasurement.findMany.mockResolvedValue([
      {
        id: 6n,
        name: 'Kilogram',
        symbol: 'KG',
        quantityMode: UnitOfMeasurementQuantityMode.FLOAT,
        status: UnitOfMeasurementStatus.ACTIVE,
      },
    ]);

    const result = await service.findOptions(
      { companyId: 11, role: AppRole.SUPER_ADMIN } as never,
      { search: ' kilo ', quantityMode: UnitOfMeasurementQuantityMode.FLOAT },
    );

    expect(prisma.unitOfMeasurement.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          companyId: 11,
          deletedAt: null,
          status: UnitOfMeasurementStatus.ACTIVE,
          quantityMode: UnitOfMeasurementQuantityMode.FLOAT,
        }),
      }),
    );
    expect(result.units).toEqual([
      {
        id: '6',
        name: 'Kilogram',
        symbol: 'KG',
        quantityMode: UnitOfMeasurementQuantityMode.FLOAT,
        status: UnitOfMeasurementStatus.ACTIVE,
      },
    ]);
  });

  it('rejects duplicate unit symbols after normalization', () => {
    const { service } = createService();
    const units = [
      { name: 'Kilogram', symbol: 'kg', quantityMode: UnitOfMeasurementQuantityMode.FLOAT },
      { name: 'Kilogram Pack', symbol: ' K G ', quantityMode: UnitOfMeasurementQuantityMode.FLOAT },
    ];

    expect(() => callPrivate(service, 'ensureNoDuplicateImportValues', units)).toThrow(BadRequestException);
  });
});

function callPrivate(service: UnitOfMeasurementService, methodName: string, ...args: unknown[]) {
  return (service as never as Record<string, (...values: unknown[]) => unknown>)[methodName](...args);
}
