import { Prisma } from '@prisma/client';

export const BillingStatementInclude = {
  details: {
    orderBy: {
      lineNumber: 'asc',
    },
  },
  party: true,
  receivableAccount: true,
  term: true,
} satisfies Prisma.BillingStatementInclude;
