import { ResponsibilityCenterStatus } from '@prisma/client';
import { ResponsibilityCenterLookupService } from './responsibility-center-lookup.service';

describe('ResponsibilityCenterLookupService', () => {
  it('parses relationship filters and maps the center type name', async () => {
    const prisma = { responsibilityCenter: { findMany: jest.fn() } };
    const service = new ResponsibilityCenterLookupService(prisma as never);
    prisma.responsibilityCenter.findMany.mockResolvedValue([
      { id: 6n, code: 'OPS', name: 'Operations', status: ResponsibilityCenterStatus.ACTIVE, type: { name: 'Department' } },
    ]);

    const result = await service.findOptions({ companyId: 11, query: { typeId: '2', classificationId: '3', search: ' ops ' } });

    expect(prisma.responsibilityCenter.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          companyId: 11,
          typeId: 2n,
          type: { classificationId: 3n },
          OR: [{ code: { contains: 'ops', mode: 'insensitive' } }, { name: { contains: 'ops', mode: 'insensitive' } }],
        }),
      }),
    );
    expect(result).toEqual([{ id: '6', code: 'OPS', name: 'Operations', typeName: 'Department', status: ResponsibilityCenterStatus.ACTIVE }]);
  });
});
