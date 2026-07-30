import { Prisma } from '@prisma/client';

export const AccountsPayableVoucherInclude = {
  creditAccount: true,
  details: {
    orderBy: {
      lineNumber: 'asc',
    },
  },
  term: true,
} satisfies Prisma.AccountsPayableVoucherInclude;
