import { Prisma } from '@prisma/client';

export const ItemVariationWithValuesInclude = {
  values: {
    where: {
      deletedAt: null,
    },
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
  },
} satisfies Prisma.ItemAttributeInclude;

export type ItemVariationWithValues = Prisma.ItemAttributeGetPayload<{
  include: typeof ItemVariationWithValuesInclude;
}>;
