import { Prisma } from '@prisma/client';

export const PartyInclude = {
  addresses: {
    orderBy: [{ isDefault: 'desc' }, { id: 'asc' }],
  },
  customerAdvanceAccount: true,
  defaultPayableAccount: true,
  defaultReceivableAccount: true,
  employeeAdvanceAccount: true,
  employeePayableAccount: true,
  partyEntityType: true,
  term: true,
  vendorAdvanceAccount: true,
} satisfies Prisma.PartyInclude;
