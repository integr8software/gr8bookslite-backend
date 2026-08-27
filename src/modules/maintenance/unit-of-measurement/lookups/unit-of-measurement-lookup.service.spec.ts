/* eslint-disable @typescript-eslint/no-unsafe-assignment -- Jest asymmetric matchers are typed as any. */
import { UnitOfMeasurementQuantityMode, UnitOfMeasurementStatus } from '@prisma/client';
import { UnitOfMeasurementLookupService } from './unit-of-measurement-lookup.service';

describe('UnitOfMeasurementLookupService', () => {
  it('builds the searchable active-unit lookup and maps its result', async () => {
    const prisma = { unitOfMeasurement: { findMany: jest.fn() } };
    const service = new UnitOfMeasurementLookupService(prisma as never);
    prisma.unitOfMeasurement.findMany.mockResolvedValue([
      { id: 2n, name: 'Piece', symbol: 'pc', quantityMode: UnitOfMeasurementQuantityMode.INTEGER, status: UnitOfMeasurementStatus.ACTIVE },
    ]);

    const result = await service.findOptions({ companyId: 11, search: ' pc ', quantityMode: UnitOfMeasurementQuantityMode.INTEGER });

    expect(prisma.unitOfMeasurement.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          companyId: 11,
          status: UnitOfMeasurementStatus.ACTIVE,
          quantityMode: UnitOfMeasurementQuantityMode.INTEGER,
          OR: [{ name: { contains: 'pc', mode: 'insensitive' } }, { symbol: { contains: 'pc', mode: 'insensitive' } }],
        }),
      }),
    );
    expect(result[0]).toEqual(expect.objectContaining({ id: '2', name: 'Piece', symbol: 'pc' }));
  });
});
