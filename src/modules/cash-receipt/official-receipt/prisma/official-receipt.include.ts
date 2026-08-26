import { Prisma } from '@prisma/client';

export const OfficialReceiptInclude = {
  details: {
    orderBy: {
      lineNumber: 'asc',
    },
  },
  party: true,
  receivableAccount: true,
  term: true,
} satisfies Prisma.OfficialReceiptInclude;
