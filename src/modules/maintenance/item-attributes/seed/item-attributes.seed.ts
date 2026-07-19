import { ItemAttributeStatus, ItemAttributeUsage, ItemAttributeValueStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';

type ItemAttributeWriteClient = Pick<PrismaService, 'itemAttribute'> | Prisma.TransactionClient;

type ItemAttributeSeedRecord = {
  code: string;
  name: string;
  usage: ItemAttributeUsage;
  values: string[];
  requiredOnItem: boolean;
  affectsStock: boolean;
};

export const ItemAttributeSeedRecords: ItemAttributeSeedRecord[] = [
  {
    code: 'ATT-001',
    name: 'Color',
    usage: ItemAttributeUsage.VARIANT,
    values: ['Black', 'White', 'Red', 'Blue', 'Green', 'Gray', 'Yellow', 'Orange', 'Purple', 'Pink', 'Brown', 'Transparent'],
    requiredOnItem: false,
    affectsStock: true,
  },
  {
    code: 'ATT-002',
    name: 'Size',
    usage: ItemAttributeUsage.VARIANT,
    values: ['XS', 'Small', 'Medium', 'Large', 'XL', 'XXL'],
    requiredOnItem: false,
    affectsStock: true,
  },
  {
    code: 'ATT-003',
    name: 'Material',
    usage: ItemAttributeUsage.ITEM_DETAIL,
    values: ['Cotton', 'Plastic', 'Steel', 'Wood', 'Glass', 'Paper', 'Leather'],
    requiredOnItem: false,
    affectsStock: false,
  },
  {
    code: 'ATT-004',
    name: 'Grade',
    usage: ItemAttributeUsage.STOCK_CLASSIFICATION,
    values: ['A', 'B', 'C'],
    requiredOnItem: false,
    affectsStock: true,
  },
  {
    code: 'ATT-005',
    name: 'Serving Temperature',
    usage: ItemAttributeUsage.ITEM_DETAIL,
    values: ['Hot', 'Cold', 'Mild'],
    requiredOnItem: false,
    affectsStock: false,
  },
];

export async function seedCompanyItemAttributeDefaults(tx: ItemAttributeWriteClient, companyId: number) {
  const existingAttributes = await tx.itemAttribute.findMany({
    where: {
      companyId,
      deletedAt: null,
      OR: [
        { code: { in: ItemAttributeSeedRecords.map((attribute) => attribute.code), mode: 'insensitive' } },
        { name: { in: ItemAttributeSeedRecords.map((attribute) => attribute.name), mode: 'insensitive' } },
      ],
    },
    select: { code: true, name: true },
  });
  const existingCodes = new Set(existingAttributes.map((attribute) => attribute.code.toUpperCase()));
  const existingNames = new Set(existingAttributes.map((attribute) => attribute.name.toLowerCase()));
  const missingAttributes = ItemAttributeSeedRecords.filter(
    (attribute) => !existingCodes.has(attribute.code.toUpperCase()) && !existingNames.has(attribute.name.toLowerCase()),
  );

  for (const attribute of missingAttributes) {
    await tx.itemAttribute.create({
      data: {
        companyId,
        code: attribute.code,
        name: attribute.name,
        usage: attribute.usage,
        requiredOnItem: attribute.requiredOnItem,
        affectsStock: attribute.affectsStock,
        status: ItemAttributeStatus.ACTIVE,
        createdByUserId: null,
        values: {
          create: attribute.values.map((label, index) => ({
            label,
            sortOrder: index + 1,
            isUsed: true,
            status: ItemAttributeValueStatus.ACTIVE,
          })),
        },
      },
    });
  }

  return missingAttributes.length;
}
