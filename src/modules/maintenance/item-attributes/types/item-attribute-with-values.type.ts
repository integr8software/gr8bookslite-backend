import { Prisma } from '@prisma/client';

export const ItemAttributeWithValuesInclude = {
  values: {
    where: {
      deletedAt: null,
    },
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
  },
} satisfies Prisma.ItemAttributeInclude;

export type ItemAttributeWithValues = Prisma.ItemAttributeGetPayload<{
  include: typeof ItemAttributeWithValuesInclude;
}>;
