import { ItemAttributeStatus, ItemAttributeValueStatus } from '@prisma/client';
import { ItemVariationsLookupService } from './item-variations-lookup.service';

describe('ItemVariationsLookupService', () => {
  it('returns active variations and only requests active values', async () => {
    const prisma = { itemAttribute: { findMany: jest.fn() } };
    const service = new ItemVariationsLookupService(prisma as never);
    prisma.itemAttribute.findMany.mockResolvedValue([
      {
        id: 4n,
        code: 'COLOR',
        name: 'Color',
        usage: 'SKU',
        requiredOnItem: true,
        affectsStock: true,
        status: ItemAttributeStatus.ACTIVE,
        values: [{ id: 9n, label: 'Blue', isUsed: true, status: ItemAttributeValueStatus.ACTIVE }],
      },
    ]);

    const result = await service.findOptions({ companyId: 11 });

    expect(prisma.itemAttribute.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { companyId: 11, deletedAt: null, status: ItemAttributeStatus.ACTIVE },
        include: expect.objectContaining({
          values: expect.objectContaining({ where: { deletedAt: null, status: ItemAttributeValueStatus.ACTIVE } }),
        }),
      }),
    );
    expect(result[0]).toEqual(expect.objectContaining({ id: '4', values: [expect.objectContaining({ id: '9', label: 'Blue' })] }));
  });
});
