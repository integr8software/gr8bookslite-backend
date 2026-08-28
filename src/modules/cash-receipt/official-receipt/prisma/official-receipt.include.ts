import { Prisma } from '@prisma/client';

export const OfficialReceiptInclude = {
  details: {
    orderBy: {
      lineNumber: 'asc',
    },
  },
  payment: true,
  party: true,
  receivableAccount: true,
} satisfies Prisma.OfficialReceiptInclude;
