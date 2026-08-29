import { Prisma } from '@prisma/client';

export const PettyCashReplenishmentInclude = {
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
} satisfies Prisma.PettyCashReplenishmentInclude;

export type PettyCashReplenishmentRecordWithRelations = Prisma.PettyCashReplenishmentGetPayload<{
  include: typeof PettyCashReplenishmentInclude;
}>;
