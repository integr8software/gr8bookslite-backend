import {
  ItemAttributeStatus as ItemVariationStatus,
  ItemAttributeUsage as ItemVariationUsage,
  ItemAttributeValueStatus as ItemVariationValueStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';

type ItemVariationWriteClient = Pick<PrismaService, 'itemAttribute'> | Prisma.TransactionClient;

type ItemVariationSeedRecord = {
  code: string;
  name: string;
  usage: ItemVariationUsage;
  values: string[];
  requiredOnItem: boolean;
  affectsStock: boolean;
};

export const ItemVariationSeedRecords: ItemVariationSeedRecord[] = [
  {
    code: 'ATT-001',
    name: 'Color',
    usage: ItemVariationUsage.VARIANT,
    values: ['Black', 'White', 'Red', 'Blue', 'Green', 'Gray', 'Yellow', 'Orange', 'Purple', 'Pink', 'Brown', 'Transparent'],
    requiredOnItem: false,
    affectsStock: true,
  },
  {
    code: 'ATT-002',
    name: 'Size',
    usage: ItemVariationUsage.VARIANT,
    values: ['XS', 'Small', 'Medium', 'Large', 'XL', 'XXL'],
    requiredOnItem: false,
    affectsStock: true,
  },
  {
    code: 'ATT-003',
    name: 'Material',
    usage: ItemVariationUsage.ITEM_DETAIL,
    values: ['Cotton', 'Plastic', 'Steel', 'Wood', 'Glass', 'Paper', 'Leather'],
    requiredOnItem: false,
    affectsStock: false,
  },
  {
    code: 'ATT-004',
    name: 'Grade',
    usage: ItemVariationUsage.STOCK_CLASSIFICATION,
    values: ['A', 'B', 'C'],
    requiredOnItem: false,
    affectsStock: true,
  },
  {
    code: 'ATT-005',
    name: 'Serving Temperature',
    usage: ItemVariationUsage.ITEM_DETAIL,
    values: ['Hot', 'Cold', 'Mild'],
    requiredOnItem: false,
    affectsStock: false,
  },
];

export async function seedCompanyItemVariationDefaults(tx: ItemVariationWriteClient, companyId: number) {
  const existingVariations = await tx.itemAttribute.findMany({
    where: {
      companyId,
      deletedAt: null,
      OR: [
        { code: { in: ItemVariationSeedRecords.map((variation) => variation.code), mode: 'insensitive' } },
        { name: { in: ItemVariationSeedRecords.map((variation) => variation.name), mode: 'insensitive' } },
      ],
    },
    select: { code: true, name: true },
  });
  const existingCodes = new Set(existingVariations.map((variation) => variation.code.toUpperCase()));
  const existingNames = new Set(existingVariations.map((variation) => variation.name.toLowerCase()));
  const missingVariations = ItemVariationSeedRecords.filter(
    (variation) => !existingCodes.has(variation.code.toUpperCase()) && !existingNames.has(variation.name.toLowerCase()),
  );

  for (const variation of missingVariations) {
    await tx.itemAttribute.create({
      data: {
        companyId,
        code: variation.code,
        name: variation.name,
        usage: variation.usage,
        requiredOnItem: variation.requiredOnItem,
        affectsStock: variation.affectsStock,
        status: ItemVariationStatus.ACTIVE,
        createdByUserId: null,
        values: {
          create: variation.values.map((label, index) => ({
            label,
            sortOrder: index + 1,
            isUsed: true,
            status: ItemVariationValueStatus.ACTIVE,
          })),
        },
      },
    });
  }

  return missingVariations.length;
}
