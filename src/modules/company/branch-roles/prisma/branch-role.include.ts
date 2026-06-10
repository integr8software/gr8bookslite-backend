import { Prisma } from '@prisma/client';

export const BranchRoleInclude = {
  permissions: {
    where: {
      permission: {
        isActive: true,
        OR: [
          {
            targetType: 'MODULE',
            module: { isActive: true },
          },
          {
            targetType: 'SUBMODULE',
            module: { isActive: true },
            submodule: {
              isActive: true,
              module: { isActive: true },
            },
          },
        ],
      },
    },
    include: {
      permission: {
        include: {
          module: true,
          submodule: {
            include: {
              module: true,
            },
          },
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
