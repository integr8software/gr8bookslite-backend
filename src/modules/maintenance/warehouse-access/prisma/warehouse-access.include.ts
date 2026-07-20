import { Prisma } from '@prisma/client';

export const WarehouseAccessInclude = {
  warehouse: {
    select: {
      id: true,
      code: true,
      name: true,
    },
  },
  user: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
} satisfies Prisma.WarehouseAccessInclude;
