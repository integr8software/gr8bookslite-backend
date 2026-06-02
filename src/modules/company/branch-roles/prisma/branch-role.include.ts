import { Prisma } from '@prisma/client';

export const BranchRoleInclude = {
  permissions: {
    include: {
      permission: {
        include: {
          module: true,
        },
      },
    },
    orderBy: [
      { permission: { module: { sortOrder: 'asc' } } },
      { permission: { name: 'asc' } },
    ],
  },
} satisfies Prisma.CompanyRoleInclude;

export type BranchRoleRecord = Prisma.CompanyRoleGetPayload<{
  include: typeof BranchRoleInclude;
}>;
