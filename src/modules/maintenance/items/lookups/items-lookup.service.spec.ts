import { Prisma } from '@prisma/client';
import { AppRole } from '../../../../common/enums/app-role.enum';
import { ItemsLookupService } from './items-lookup.service';

describe('ItemsLookupService', () => {
  function createService() {
    const prisma = {
      companyUser: {
        findFirst: jest.fn(),
      },
      itemBasicInfo: {
        findMany: jest.fn(),
      },
    };

    return { prisma, service: new ItemsLookupService(prisma as never) };
  }

  it('returns active item options for the current company user', async () => {
    const { prisma, service } = createService();
    prisma.companyUser.findFirst.mockResolvedValue({ id: 1 });
    prisma.itemBasicInfo.findMany.mockResolvedValue([
      {
        id: 100n,
        code: 'ITM-100',
        skuCode: 'SKU-100',
        name: 'Concrete Mix',
        barcode: null,
        categoryId: 5n,
        category: { name: 'Materials' },
        unitOfMeasurementId: 7n,
        unitOfMeasurement: { symbol: 'BAG' },
        brand: null,
        model: null,
        externalReferenceCode: null,
        responsibilityCenterId: null,
        responsibilityCenter: null,
        description: null,
        tags: ['construction'],
        status: 'ACTIVE',
        pricing: {
          cost: new Prisma.Decimal(125),
          sellingPrice: new Prisma.Decimal(150),
          suggestedPrice: new Prisma.Decimal(145),
          taxTreatment: 'VAT 12%',
        },
      },
    ]);

    await expect(
      service.findOptionsForCompanyUser({
        id: 1,
        companyId: 10,
        activeCompanyId: 10,
        role: AppRole.SUPER_ADMIN,
      } as never),
    ).resolves.toEqual({
      items: [
        {
          id: '100',
          code: 'ITM-100',
          skuCode: 'SKU-100',
          name: 'Concrete Mix',
          barcode: '',
          categoryId: '5',
          categoryName: 'Materials',
          unitOfMeasurementId: '7',
          unitOfMeasurementSymbol: 'BAG',
          brand: '',
          model: '',
          externalReferenceCode: '',
          responsibilityCenterId: null,
          responsibilityCenterName: '',
          description: '',
          tags: ['construction'],
          status: 'ACTIVE',
          costPrice: 125,
          sellingPrice: 150,
          suggestedPrice: 145,
          taxTreatment: 'VAT 12%',
        },
      ],
    });

    expect(prisma.itemBasicInfo.findMany).toHaveBeenCalledWith({
      where: {
        companyId: 10,
        deletedAt: null,
        status: 'ACTIVE',
      },
      include: {
        category: true,
        unitOfMeasurement: true,
        responsibilityCenter: true,
        pricing: true,
      },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
    });
  });
});
