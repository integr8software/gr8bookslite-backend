import { Prisma } from '@prisma/client';

export const WorkspaceAuditLogListInclude = {
  actorUser: {
    select: {
      name: true,
      email: true,
      systemRole: true,
    },
  },
  company: {
    select: {
      name: true,
    },
  },
} satisfies Prisma.AuditLogInclude;

export type WorkspaceAuditLogRecord = Prisma.AuditLogGetPayload<{
  include: typeof WorkspaceAuditLogListInclude;
}>;
