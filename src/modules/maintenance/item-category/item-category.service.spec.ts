import { ItemCategoryStatus } from '@prisma/client';
import { AppRole } from '../../../common/enums/app-role.enum';
import { ItemCategoryService } from './item-category.service';

describe('ItemCategoryService category options', () => {
  function createService() {
    const prisma = {
      itemCategory: {
        findMany: jest.fn(),
      },
    };

    return { prisma, service: new ItemCategoryService(prisma as never) };
  }

  it('returns active company categories with bigint identifiers serialized', async () => {
    const { prisma, service } = createService();
    prisma.itemCategory.findMany.mockResolvedValue([
      {
        id: 21n,
        code: 'CAT-00021',
        name: 'Beverages',
        description: 'Ready-to-sell drinks',
        parentId: 4n,
        behaviors: ['Sellable Item', 'Purchasable Item'],
        allowSubCategory: true,
        status: ItemCategoryStatus.ACTIVE,
      },
    ]);

    const result = await service.findOptions({ companyId: 11, role: AppRole.SUPER_ADMIN } as never);

    expect(prisma.itemCategory.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { companyId: 11, deletedAt: null, status: ItemCategoryStatus.ACTIVE },
      }),
    );
    expect(result.categories).toEqual([
      {
        id: '21',
        code: 'CAT-00021',
        name: 'Beverages',
        description: 'Ready-to-sell drinks',
        parentId: '4',
        behaviors: ['Sellable Item', 'Purchasable Item'],
        allowSubCategory: true,
        status: ItemCategoryStatus.ACTIVE,
      },
    ]);
  });
});
