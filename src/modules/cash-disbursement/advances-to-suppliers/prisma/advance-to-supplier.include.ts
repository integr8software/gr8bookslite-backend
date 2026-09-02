import { Prisma } from '@prisma/client';

export const AdvanceToSupplierInclude = {
  party: {
    select: {
      id: true,
      partyCodeNo: true,
      partyName: true,
      tradeName: true,
      firstName: true,
      lastName: true,
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
} satisfies Prisma.AdvanceToSupplierInclude;

export type AdvanceToSupplierWithPayload = Prisma.AdvanceToSupplierGetPayload<{
  include: typeof AdvanceToSupplierInclude;
}>;
