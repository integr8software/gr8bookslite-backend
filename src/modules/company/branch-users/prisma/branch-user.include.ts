import { Prisma } from '@prisma/client';

export const BranchUserRoleInclude = {
  permissions: {
    include: {
      permission: {
        include: {
          module: true,
        },
      },
    },
    orderBy: [{ permission: { module: { sortOrder: 'asc' } } }],
  },
} satisfies Prisma.CompanyRoleInclude;

export const BranchUserMembershipInclude = {
  user: true,
  companyRole: {
    include: BranchUserRoleInclude,
  },
} satisfies Prisma.MembershipInclude;

export type BranchUserRoleRecord = Prisma.CompanyRoleGetPayload<{
  include: typeof BranchUserRoleInclude;
}>;

export type BranchUserMembershipRecord = Prisma.MembershipGetPayload<{
  include: typeof BranchUserMembershipInclude;
}>;
