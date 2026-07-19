import { Prisma } from '@prisma/client';

export const WarehouseMaintenanceInclude = {
  branches: {
    include: {
      unit: true,
    },
    orderBy: {
      unit: {
        name: 'asc',
      },
    },
  },
} satisfies Prisma.WarehouseInclude;
