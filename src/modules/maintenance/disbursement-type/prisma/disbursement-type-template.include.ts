import type { Prisma } from '@prisma/client';

export const DisbursementTypeInclude = {
  expenseCoa: true,
  revenueCoa: true,
  assetCoa: true,
  accumulatedDepreciationCoa: true,
} satisfies Prisma.DefaultAccountInclude;
