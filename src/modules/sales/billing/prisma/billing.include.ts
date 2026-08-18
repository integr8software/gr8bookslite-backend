import { Prisma } from '@prisma/client';

export const BillingInclude = {
  details: {
    orderBy: {
      lineNumber: 'asc',
    },
  },
  party: true,
  receivableAccount: true,
  term: true,
} satisfies Prisma.BillingInclude;
