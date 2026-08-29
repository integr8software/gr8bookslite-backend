import { Prisma } from '@prisma/client';

export const RevolvingFundInclude = {
  company: true,
  branchUnit: true,
  party: true,
  creditAccount: true,
  responsibilityCenter: true,
  details: {
    orderBy: { lineNumber: 'asc' },
    include: {
      party: true,
      responsibilityCenter: true,
    },
  },
} satisfies Prisma.RevolvingFundInclude;

export type RevolvingFundRecordWithRelations = Prisma.RevolvingFundGetPayload<{
  include: typeof RevolvingFundInclude;
}>;
