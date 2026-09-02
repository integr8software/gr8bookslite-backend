import { Prisma } from '@prisma/client';

export const ProvisionalReceiptInclude = {
  details: {
    orderBy: {
      lineNumber: 'asc',
    },
  },
  payment: true,
  party: true,
  receivableAccount: true,
} satisfies Prisma.ProvisionalReceiptInclude;
