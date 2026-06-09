import type { Prisma } from '@prisma/client';

export type CreateWorkspaceAuditLogInput = {
  actorUserId: number;
  action: string;
  companyId?: number | null;
  entityType: string;
  entityId?: string | number | null;
  metadata?: Prisma.InputJsonValue;
  targetUserId?: number | null;
  ipAddress?: string | null;
  userAgent?: string | null;
};

export type RecordWorkspaceActivityInput = {
  path: string;
  module: string;
  branchId?: string;
  branchName?: string;
  ipAddress?: string | null;
  userAgent?: string | null;
};
