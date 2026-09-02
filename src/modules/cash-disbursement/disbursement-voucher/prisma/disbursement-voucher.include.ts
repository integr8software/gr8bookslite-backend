import { Prisma } from '@prisma/client';

export const DisbursementVoucherInclude = {
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
} satisfies Prisma.DisbursementVoucherInclude;
