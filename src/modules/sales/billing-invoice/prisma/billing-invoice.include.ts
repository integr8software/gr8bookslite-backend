import { Prisma } from '@prisma/client';

export const BillingInvoiceInclude = {
  details: {
    orderBy: {
      lineNumber: 'asc',
    },
  },
  party: true,
  receivableAccount: true,
  term: true,
} satisfies Prisma.BillingInvoiceInclude;
