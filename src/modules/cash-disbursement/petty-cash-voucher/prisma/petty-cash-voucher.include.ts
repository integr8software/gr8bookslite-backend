import { Prisma } from '@prisma/client';

export const PettyCashVoucherInclude = {
  company: true,
  branchUnit: true,
  party: true,
  creditAccount: true,
  responsibilityCenter: true,
} satisfies Prisma.PettyCashVoucherInclude;

export type PettyCashVoucherRecordWithRelations = Prisma.PettyCashVoucherGetPayload<{
  include: typeof PettyCashVoucherInclude;
}>;
