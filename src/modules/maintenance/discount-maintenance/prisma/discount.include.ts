import { Prisma } from '@prisma/client';

export const DiscountInclude = {
  chartAccount: true,
} satisfies Prisma.DiscountInclude;
