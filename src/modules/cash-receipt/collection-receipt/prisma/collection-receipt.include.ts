import { Prisma } from '@prisma/client';

export const CollectionReceiptInclude = {
  details: {
    orderBy: {
      lineNumber: 'asc',
    },
  },
  payment: true,
  party: true,
  receivableAccount: true,
} satisfies Prisma.CollectionReceiptInclude;
