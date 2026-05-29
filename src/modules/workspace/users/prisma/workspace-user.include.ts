import { Prisma } from '@prisma/client';

export const WorkspaceUserMembershipInclude = {
  user: true,
  unitAccess: true,
} satisfies Prisma.MembershipInclude;

export type WorkspaceUserMembershipRecord = Prisma.MembershipGetPayload<{
  include: typeof WorkspaceUserMembershipInclude;
}>;
