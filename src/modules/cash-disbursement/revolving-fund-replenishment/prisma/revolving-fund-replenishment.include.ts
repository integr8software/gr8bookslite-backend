import { Prisma } from '@prisma/client';

export const RevolvingFundReplenishmentInclude = {
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
} satisfies Prisma.RevolvingFundReplenishmentInclude;

export type RevolvingFundReplenishmentRecordWithRelations = Prisma.RevolvingFundReplenishmentGetPayload<{
  include: typeof RevolvingFundReplenishmentInclude;
}>;
