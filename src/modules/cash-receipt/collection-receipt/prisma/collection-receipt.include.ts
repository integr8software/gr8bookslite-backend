import { Prisma } from '@prisma/client';

export const CollectionReceiptInclude = {
  details: {
    orderBy: {
      lineNumber: 'asc',
    },
  },
  party: true,
  receivableAccount: true,
  term: true,
} satisfies Prisma.CollectionReceiptInclude;
