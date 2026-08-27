import { Prisma } from '@prisma/client';

export const ProvisionalReceiptInclude = {
  details: {
    orderBy: {
      lineNumber: 'asc',
    },
  },
  party: true,
  receivableAccount: true,
  term: true,
} satisfies Prisma.ProvisionalReceiptInclude;
