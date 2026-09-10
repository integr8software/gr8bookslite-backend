import type { Prisma } from '@prisma/client';

export const CollectionTypeInclude = {
  expenseCoa: true,
  revenueCoa: true,
  assetCoa: true,
  accumulatedDepreciationCoa: true,
} satisfies Prisma.DefaultAccountInclude;
