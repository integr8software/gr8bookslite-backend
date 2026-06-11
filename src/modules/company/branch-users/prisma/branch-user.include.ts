import { Prisma } from '@prisma/client';

export const BranchUserRoleInclude = {
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
    orderBy: [{ permission: { module: { sortOrder: 'asc' } } }],
  },
} satisfies Prisma.CompanyRoleInclude;

export const BranchUserMembershipInclude = {
  user: true,
  unitAccess: {
    include: {
      companyRole: {
        include: BranchUserRoleInclude,
      },
    },
  },
} satisfies Prisma.MembershipInclude;

export type BranchUserRoleRecord = Prisma.CompanyRoleGetPayload<{
  include: typeof BranchUserRoleInclude;
}>;

export type BranchUserMembershipRecord = Prisma.MembershipGetPayload<{
  include: typeof BranchUserMembershipInclude;
}>;
