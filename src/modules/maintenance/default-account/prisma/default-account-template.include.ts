import type { Prisma } from '@prisma/client';

export const DefaultAccountTemplateInclude = {
  expenseCoa: true,
  revenueCoa: true,
  assetCoa: true,
  accumulatedDepreciationCoa: true,
} satisfies Prisma.DefaultAccountTemplateInclude;
