import type { Prisma } from '@prisma/client';
import { DiscountInclude } from '../prisma/discount.include';

export type DiscountWithAccount = Prisma.DiscountGetPayload<{
  include: typeof DiscountInclude;
}>;
