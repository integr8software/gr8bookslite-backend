import { Injectable } from '@nestjs/common';
import { MembershipStatus } from '@prisma/client';
import { AppRole } from '../../../common/enums/app-role.enum';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { PrismaService } from '../../../prisma/prisma.service';
import { mapWorkspaceAuditLog } from './mappers/workspace-audit-log.mapper';
import { WorkspaceAuditLogListInclude } from './prisma/workspace-audit-log.include';
import type { CreateWorkspaceAuditLogInput, RecordWorkspaceActivityInput } from './types/workspace-audit-log-input.type';

const QueryResultLimit = 500;

@Injectable()
export class WorkspaceAuditLogsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(user: AuthUser) {
    const companyIds = await this.getVisibleCompanyIds(user);

    if (user.role !== AppRole.SUPER_ADMIN && companyIds.length === 0) {
      return [];
    }

    const logs = await this.prisma.auditLog.findMany({
      where:
        user.role === AppRole.SUPER_ADMIN
          ? undefined
          : {
              companyId: { in: companyIds },
            },
      include: WorkspaceAuditLogListInclude,
      orderBy: { createdAt: 'desc' },
      take: QueryResultLimit,
    });

    return logs.map(mapWorkspaceAuditLog);
  }

  async record(input: CreateWorkspaceAuditLogInput) {
    await this.prisma.auditLog.create({
      data: {
        actorUserId: input.actorUserId,
        action: normalizeStoredAction(input.action),
        companyId: input.companyId ?? null,
        entityType: input.entityType,
        entityId: input.entityId === undefined || input.entityId === null ? null : String(input.entityId),
        metadata: input.metadata ?? undefined,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
      },
    });
  }

  async recordActivity(user: AuthUser, input: RecordWorkspaceActivityInput) {
    const moduleName = input.module.trim();
    const path = input.path.trim();
    const action = input.action?.trim() || 'VIEW';

    if (!moduleName || !path) {
      return { message: 'Activity ignored.' };
    }

    await this.record({
      actorUserId: user.id,
      action,
      companyId: user.companyId,
      entityType: input.entityType?.trim() || 'ModuleView',
      entityId: input.entityId?.trim() || path,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      metadata: {
        branchId: input.branchId,
        branchName: input.branchName,
        description: input.description?.trim() || (action.toUpperCase() === 'VIEW' ? `${moduleName} was opened.` : `${moduleName} activity was recorded.`),
        module: moduleName,
        path,
      },
    });

    return { message: 'Activity logged.' };
  }

  private async getVisibleCompanyIds(user: AuthUser) {
    if (user.role === AppRole.SUPER_ADMIN) {
      const companies = await this.prisma.company.findMany({
        select: { id: true },
      });

      return companies.map((company) => company.id);
    }

    const memberships = await this.prisma.membership.findMany({
      where: {
        userId: user.id,
        status: { not: MembershipStatus.REMOVED },
      },
      select: { companyId: true },
    });

    return memberships.map((membership) => membership.companyId);
  }
}

function normalizeStoredAction(action: string) {
  return action.trim().toUpperCase();
}
