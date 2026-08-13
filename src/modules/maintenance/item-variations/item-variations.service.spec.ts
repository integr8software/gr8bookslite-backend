import { ItemAttributeStatus, ItemAttributeUsage, ItemAttributeValueStatus } from '@prisma/client';
import { AppRole } from '../../../common/enums/app-role.enum';
import { ItemVariationsService } from './item-variations.service';

describe('ItemVariationsService variation options', () => {
  function createService() {
    const prisma = {
      itemAttribute: {
        findMany: jest.fn(),
      },
    };

    return { prisma, service: new ItemVariationsService(prisma as never) };
  }

  it('returns active variations and their active values', async () => {
    const { prisma, service } = createService();
    prisma.itemAttribute.findMany.mockResolvedValue([
      {
        id: 12n,
        code: 'VAR-00012',
        name: 'Size',
        usage: ItemAttributeUsage.VARIATION,
        requiredOnItem: true,
        affectsStock: true,
        status: ItemAttributeStatus.ACTIVE,
        values: [
          { id: 31n, label: 'Large', isUsed: true, status: ItemAttributeValueStatus.ACTIVE },
        ],
      },
    ]);

    const result = await service.findOptions({ companyId: 11, role: AppRole.SUPER_ADMIN } as never);

    expect(prisma.itemAttribute.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { companyId: 11, deletedAt: null, status: ItemAttributeStatus.ACTIVE },
      }),
    );
    expect(result.variations).toEqual([
      {
        id: '12',
        code: 'VAR-00012',
        name: 'Size',
        usage: ItemAttributeUsage.VARIATION,
        requiredOnItem: true,
        affectsStock: true,
        status: ItemAttributeStatus.ACTIVE,
        values: [{ id: '31', label: 'Large', isUsed: true, status: ItemAttributeValueStatus.ACTIVE }],
      },
    ]);
  });
});
