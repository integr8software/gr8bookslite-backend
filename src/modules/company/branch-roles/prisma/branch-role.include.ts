import { Prisma } from '@prisma/client';

export const BranchRoleInclude = {
  permissions: {
    where: {
      permission: {
        isActive: true,
        module: { isActive: true },
      },
    },
    include: {
      permission: {
        include: { module: true },
      },
    },
    orderBy: [{ permission: { name: 'asc' } }],
  },
} satisfies Prisma.CompanyRoleInclude;

export type BranchRoleRecord = Prisma.CompanyRoleGetPayload<{
  include: typeof BranchRoleInclude;
}>;
