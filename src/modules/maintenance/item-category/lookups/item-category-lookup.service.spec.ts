import { ItemCategoryStatus } from '@prisma/client';
import { ItemCategoryLookupService } from './item-category-lookup.service';

describe('ItemCategoryLookupService', () => {
  it('returns active categories with serialized parent ids', async () => {
    const prisma = { itemCategory: { findMany: jest.fn() } };
    const service = new ItemCategoryLookupService(prisma as never);
    prisma.itemCategory.findMany.mockResolvedValue([
      {
        id: 5n,
        code: 'RAW',
        name: 'Raw materials',
        description: null,
        parentId: 3n,
        behaviors: [],
        allowSubCategory: false,
        status: ItemCategoryStatus.ACTIVE,
      },
    ]);

    await expect(service.findOptions({ companyId: 11 })).resolves.toEqual([
      expect.objectContaining({ id: '5', parentId: '3', status: ItemCategoryStatus.ACTIVE }),
    ]);
    expect(prisma.itemCategory.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { companyId: 11, deletedAt: null, status: ItemCategoryStatus.ACTIVE } }),
    );
  });
});
