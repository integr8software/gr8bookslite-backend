import { Prisma } from '@prisma/client';

export const ChartAccountInclude = {
  bankAccounts: {
    orderBy: [{ isDefault: 'desc' }, { bankName: 'asc' }, { id: 'asc' }],
  },
} satisfies Prisma.ChartAccountInclude;
