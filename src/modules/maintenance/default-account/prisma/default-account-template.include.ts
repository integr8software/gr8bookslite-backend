import type { Prisma } from '@prisma/client';

export const DefaultAccountInclude = {
  expenseCoa: true,
  revenueCoa: true,
  assetCoa: true,
  accumulatedDepreciationCoa: true,
} satisfies Prisma.DefaultAccountInclude;
