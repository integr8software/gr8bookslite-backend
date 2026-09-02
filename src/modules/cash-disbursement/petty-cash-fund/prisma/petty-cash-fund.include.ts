import { Prisma } from '@prisma/client';

export const PettyCashFundInclude = {
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
} satisfies Prisma.PettyCashFundInclude;

export type PettyCashFundRecordWithRelations = Prisma.PettyCashFundGetPayload<{
  include: typeof PettyCashFundInclude;
}>;
