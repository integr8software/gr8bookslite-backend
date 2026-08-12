import { Prisma } from '@prisma/client';

export const ServiceInvoiceInclude = {
  details: {
    orderBy: {
      lineNumber: 'asc',
    },
  },
  party: true,
  receivableAccount: true,
  term: true,
} satisfies Prisma.ServiceInvoiceInclude;
