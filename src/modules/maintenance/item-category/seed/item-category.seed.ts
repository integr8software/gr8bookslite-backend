import { ItemCategoryAccountingSetupMode, ItemCategoryStatus, Prisma } from '@prisma/client';
import { resolveItemCategoryAccountingAccounts } from '../utils/item-category-accounting.util';

type ItemCategoryWriteClient = Prisma.TransactionClient;

type ItemCategorySeedRecord = {
  name: string;
  children?: ItemCategorySeedRecord[];
};

type ItemCategorySeedPath = {
  name: string;
  pathName: string;
};

export const ItemCategorySeedRecords: ItemCategorySeedRecord[] = [
  {
    name: 'Electronics',
    children: [
      {
        name: 'Audio & Video',
        children: [{ name: 'Televisions' }, { name: 'Speakers' }, { name: 'Soundbars' }, { name: 'Home Theater Systems' }],
      },
      {
        name: 'Cameras',
        children: [{ name: 'DSLR Cameras' }, { name: 'Mirrorless Cameras' }, { name: 'Action Cameras' }],
      },
      {
        name: 'Wearable Technology',
        children: [{ name: 'Smart Watches' }, { name: 'Fitness Trackers' }],
      },
    ],
  },
  {
    name: 'Computers & Accessories',
    children: [
      {
        name: 'Computers',
        children: [
          { name: 'Desktops' },
          {
            name: 'Laptops',
            children: [{ name: 'Business Laptops' }, { name: 'Gaming Laptops' }, { name: 'Student Laptops' }],
          },
          { name: 'Workstations' },
        ],
      },
      {
        name: 'Computer Components',
        children: [{ name: 'Processors' }, { name: 'Motherboards' }, { name: 'Memory (RAM)' }, { name: 'Graphics Cards' }, { name: 'Storage Devices' }],
      },
      {
        name: 'Accessories',
        children: [{ name: 'Keyboards' }, { name: 'Mice' }, { name: 'Monitors' }, { name: 'Printers' }],
      },
    ],
  },
  {
    name: 'Mobile Phones & Tablets',
    children: [
      { name: 'Smartphones' },
      { name: 'Tablets' },
      {
        name: 'Mobile Accessories',
        children: [{ name: 'Cases' }, { name: 'Chargers' }, { name: 'Screen Protectors' }, { name: 'Power Banks' }],
      },
      { name: 'Smart Devices' },
    ],
  },
  {
    name: 'Home Appliances',
    children: [
      {
        name: 'Kitchen Appliances',
        children: [{ name: 'Refrigerators' }, { name: 'Microwave Ovens' }, { name: 'Rice Cookers' }],
      },
      {
        name: 'Laundry Appliances',
        children: [{ name: 'Washing Machines' }, { name: 'Dryers' }],
      },
      {
        name: 'Cleaning Appliances',
        children: [{ name: 'Vacuum Cleaners' }, { name: 'Air Purifiers' }],
      },
    ],
  },
  {
    name: 'Furniture',
    children: [
      {
        name: 'Office Furniture',
        children: [{ name: 'Office Chairs' }, { name: 'Office Tables' }, { name: 'Filing Cabinets' }],
      },
      {
        name: 'Home Furniture',
        children: [{ name: 'Sofas' }, { name: 'Beds' }, { name: 'Dining Sets' }],
      },
      { name: 'Outdoor Furniture' },
    ],
  },
  {
    name: 'Office Supplies',
    children: [
      { name: 'Paper Products' },
      { name: 'Writing Materials' },
      { name: 'Filing & Storage' },
      { name: 'Office Equipment' },
      { name: 'School Supplies' },
    ],
  },
  {
    name: 'Food & Beverages',
    children: [
      {
        name: 'Food',
        children: [{ name: 'Snacks' }, { name: 'Canned Goods' }, { name: 'Frozen Foods' }, { name: 'Bakery Products' }],
      },
      {
        name: 'Beverages',
        children: [{ name: 'Coffee' }, { name: 'Tea' }, { name: 'Soft Drinks' }, { name: 'Bottled Water' }],
      },
      { name: 'Ingredients' },
    ],
  },
  {
    name: 'Clothing & Apparel',
    children: [
      { name: "Men's Clothing" },
      { name: "Women's Clothing" },
      { name: "Children's Clothing" },
      { name: 'Footwear' },
      { name: 'Fashion Accessories' },
    ],
  },
  {
    name: 'Health & Beauty',
    children: [{ name: 'Skincare' }, { name: 'Cosmetics' }, { name: 'Personal Care' }, { name: 'Vitamins & Supplements' }, { name: 'Medical Supplies' }],
  },
  {
    name: 'Automotive',
    children: [
      {
        name: 'Vehicle Parts',
        children: [{ name: 'Engine Parts' }, { name: 'Brake Parts' }, { name: 'Suspension Parts' }],
      },
      { name: 'Tires & Wheels' },
      { name: 'Automotive Fluids' },
      { name: 'Car Accessories' },
    ],
  },
  {
    name: 'Construction Materials',
    children: [
      { name: 'Cement & Concrete' },
      { name: 'Steel & Metal' },
      { name: 'Lumber & Wood' },
      { name: 'Roofing Materials' },
      { name: 'Electrical Materials' },
      { name: 'Plumbing Materials' },
    ],
  },
  {
    name: 'Tools & Hardware',
    children: [
      { name: 'Hand Tools' },
      { name: 'Power Tools' },
      { name: 'Measuring Tools' },
      { name: 'Safety Equipment' },
      {
        name: 'Fasteners',
        children: [{ name: 'Screws' }, { name: 'Nuts' }, { name: 'Bolts' }, { name: 'Washers' }],
      },
    ],
  },
  {
    name: 'Sports & Recreation',
    children: [{ name: 'Fitness Equipment' }, { name: 'Outdoor Equipment' }, { name: 'Team Sports' }, { name: 'Cycling' }],
  },
  {
    name: 'Toys & Games',
    children: [{ name: 'Educational Toys' }, { name: 'Action Figures' }, { name: 'Board Games' }, { name: 'Video Games' }],
  },
  {
    name: 'Books & Stationery',
    children: [{ name: 'Books' }, { name: 'Notebooks' }, { name: 'Art Supplies' }, { name: 'Educational Materials' }],
  },
  {
    name: 'Pet Supplies',
    children: [{ name: 'Pet Food' }, { name: 'Pet Accessories' }, { name: 'Pet Healthcare' }, { name: 'Pet Toys' }],
  },
  {
    name: 'Agricultural Products',
    children: [{ name: 'Seeds' }, { name: 'Fertilizers' }, { name: 'Farm Equipment' }, { name: 'Animal Feed' }, { name: 'Crop Protection' }],
  },
  {
    name: 'Software & Digital Products',
    children: [{ name: 'Software Licenses' }, { name: 'SaaS Subscriptions' }, { name: 'Digital Downloads' }, { name: 'Templates' }, { name: 'Online Courses' }],
  },
  { name: 'Other Products' },
];

export function flattenItemCategorySeedRecords(records: readonly ItemCategorySeedRecord[] = ItemCategorySeedRecords): ItemCategorySeedRecord[] {
  return records.flatMap((record) => [record, ...flattenItemCategorySeedRecords(record.children ?? [])]);
}

export function flattenItemCategorySeedPaths(
  records: readonly ItemCategorySeedRecord[] = ItemCategorySeedRecords,
  parentPath: string[] = [],
): ItemCategorySeedPath[] {
  return records.flatMap((record) => {
    const path = [...parentPath, record.name];

    return [
      {
        name: record.name,
        pathName: createItemCategorySeedPathName(path),
      },
      ...flattenItemCategorySeedPaths(record.children ?? [], path),
    ];
  });
}

export function createItemCategorySeedPathName(path: readonly string[]) {
  return `/${path.join('/')}`;
}

export async function seedCompanyItemCategoryDefaults(tx: ItemCategoryWriteClient, companyId: number) {
  let createdCount = 0;

  for (const [index, record] of ItemCategorySeedRecords.entries()) {
    createdCount += await seedCategoryBranch(tx, companyId, record, null, createSeedCode([index]));
  }

  return createdCount;
}

async function seedCategoryBranch(
  tx: ItemCategoryWriteClient,
  companyId: number,
  record: ItemCategorySeedRecord,
  parentId: bigint | null,
  preferredCode: string,
) {
  const category = await upsertSeedCategory(tx, companyId, record, parentId, preferredCode);
  let createdCount = category.created ? 1 : 0;

  for (const [index, child] of (record.children ?? []).entries()) {
    createdCount += await seedCategoryBranch(tx, companyId, child, category.id, createSeedCode([...parseSeedCode(preferredCode), index]));
  }

  return createdCount;
}

async function upsertSeedCategory(
  tx: ItemCategoryWriteClient,
  companyId: number,
  record: ItemCategorySeedRecord,
  parentId: bigint | null,
  preferredCode: string,
) {
  const existingCategory = await tx.itemCategory.findFirst({
    where: {
      companyId,
      parentId,
      deletedAt: null,
      name: {
        equals: record.name,
        mode: 'insensitive',
      },
    },
    select: {
      id: true,
      accountingSetupMode: true,
      costOfSalesAccountId: true,
      expenseAccountId: true,
      inventoryAccountId: true,
      salesAccountId: true,
    },
  });

  if (existingCategory) {
    if (parentId === null && needsRootAccountingSetup(existingCategory)) {
      const accountIds = await resolveItemCategoryAccountingAccounts(tx, companyId, record.name);

      await tx.itemCategory.update({
        where: { id: existingCategory.id },
        data: {
          accountingSetupMode: ItemCategoryAccountingSetupMode.AUTO_CREATE,
          inventoryAccountId: existingCategory.inventoryAccountId ?? accountIds.inventoryAccountId,
          salesAccountId: existingCategory.salesAccountId ?? accountIds.salesAccountId,
          costOfSalesAccountId: existingCategory.costOfSalesAccountId ?? accountIds.costOfSalesAccountId,
          expenseAccountId: existingCategory.expenseAccountId ?? accountIds.expenseAccountId,
        },
      });
    }

    return { id: existingCategory.id, created: false };
  }

  const code = await createAvailableSeedCode(tx, companyId, preferredCode);
  const accountIds =
    parentId === null
      ? await resolveItemCategoryAccountingAccounts(tx, companyId, record.name)
      : {
          inventoryAccountId: null,
          salesAccountId: null,
          costOfSalesAccountId: null,
          expenseAccountId: null,
        };
  const category = await tx.itemCategory.create({
    data: {
      companyId,
      parentId,
      code,
      name: record.name,
      description: `Product category for ${record.name}.`,
      accountingSetupMode: parentId === null ? ItemCategoryAccountingSetupMode.AUTO_CREATE : ItemCategoryAccountingSetupMode.INHERIT,
      ...accountIds,
      allowSubCategory: true,
      status: ItemCategoryStatus.ACTIVE,
      createdByUserId: null,
    },
    select: {
      id: true,
    },
  });

  return { id: category.id, created: true };
}

function needsRootAccountingSetup(category: {
  accountingSetupMode: ItemCategoryAccountingSetupMode;
  costOfSalesAccountId: bigint | null;
  expenseAccountId: bigint | null;
  inventoryAccountId: bigint | null;
  salesAccountId: bigint | null;
}) {
  return (
    category.accountingSetupMode !== ItemCategoryAccountingSetupMode.AUTO_CREATE ||
    !category.inventoryAccountId ||
    !category.salesAccountId ||
    !category.costOfSalesAccountId ||
    !category.expenseAccountId
  );
}

function createSeedCode(pathIndexes: number[]) {
  return `IC-${pathIndexes.map((index) => String(index + 1).padStart(3, '0')).join('-')}`;
}

function parseSeedCode(seedCode: string) {
  return seedCode
    .replace(/^IC-/i, '')
    .split('-')
    .map((part) => Number.parseInt(part, 10) - 1)
    .filter((index) => Number.isFinite(index));
}

async function createAvailableSeedCode(tx: ItemCategoryWriteClient, companyId: number, preferredCode: string) {
  const existingPreferred = await tx.itemCategory.findFirst({
    where: {
      companyId,
      code: {
        equals: preferredCode,
        mode: 'insensitive',
      },
    },
    select: {
      id: true,
    },
  });

  if (!existingPreferred) {
    return preferredCode;
  }

  const existingCodes = await tx.itemCategory.findMany({
    where: {
      companyId,
      code: {
        startsWith: 'IC-',
        mode: 'insensitive',
      },
    },
    select: {
      code: true,
    },
  });
  const codeNumbers = existingCodes
    .map((category) => /^IC-(\d+)$/i.exec(category.code)?.[1])
    .filter((codeNumber): codeNumber is string => codeNumber !== undefined)
    .map((codeNumber) => Number.parseInt(codeNumber, 10))
    .filter((codeNumber) => Number.isFinite(codeNumber));
  const nextNumber = Math.max(0, ...codeNumbers) + 1;

  return `IC-${String(nextNumber).padStart(3, '0')}`;
}
