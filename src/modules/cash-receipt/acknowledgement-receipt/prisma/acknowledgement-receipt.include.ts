import { Prisma } from '@prisma/client';

export const AcknowledgementReceiptInclude = {
  details: {
    orderBy: {
      lineNumber: 'asc',
    },
  },
  payment: true,
  party: true,
  receivableAccount: true,
} satisfies Prisma.AcknowledgementReceiptInclude;
