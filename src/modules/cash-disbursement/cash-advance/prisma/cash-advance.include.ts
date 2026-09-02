import { Prisma } from '@prisma/client';

export const CashAdvanceInclude = {
  party: {
    select: {
      id: true,
      partyCodeNo: true,
      partyName: true,
      tradeName: true,
      firstName: true,
      lastName: true,
      cashAdvanceLimit: true,
    },
  },
  creditAccount: {
    select: {
      id: true,
      accountCode: true,
      accountTitle: true,
    },
  },
  company: {
    select: {
      id: true,
      name: true,
    },
  },
} satisfies Prisma.CashAdvanceInclude;

export type CashAdvanceWithPayload = Prisma.CashAdvanceGetPayload<{
  include: typeof CashAdvanceInclude;
}>;
