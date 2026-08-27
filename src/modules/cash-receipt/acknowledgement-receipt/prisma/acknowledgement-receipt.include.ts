import { Prisma } from '@prisma/client';

export const AcknowledgementReceiptInclude = {
  details: {
    orderBy: {
      lineNumber: 'asc',
    },
  },
  party: true,
  receivableAccount: true,
  term: true,
} satisfies Prisma.AcknowledgementReceiptInclude;
