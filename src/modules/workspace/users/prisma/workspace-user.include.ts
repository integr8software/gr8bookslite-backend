import { Prisma } from '@prisma/client';

export const WorkspaceUserMembershipInclude = {
  user: {
    select: {
      id: true,
      name: true,
      email: true,
      contactNumber: true,
      status: true,
      avatarPublicUrl: true,
      createdAt: true,
      updatedAt: true,
    },
  },
  unitAccess: {
    select: {
      unitId: true,
      companyRoleId: true,
      companyRole: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
      unit: {
        select: {
          id: true,
          companyId: true,
          type: true,
          name: true,
          isActive: true,
        },
      },
    },
  },

} satisfies Prisma.MembershipInclude;

export type WorkspaceUserMembershipRecord = Prisma.MembershipGetPayload<{
  include: typeof WorkspaceUserMembershipInclude;
}>;
