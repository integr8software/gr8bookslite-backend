import { Prisma } from '@prisma/client';

export const CashVoucherInclude = {
  company: true,
  branchUnit: true,
  party: true,
  creditAccount: true,
  details: {
    include: {
      account: true,
      party: true,
      responsibilityCenter: true,
    },
    orderBy: {
      lineNumber: 'asc' as const,
    },
  },
} satisfies Prisma.CashVoucherInclude;
