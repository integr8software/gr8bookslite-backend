import { BadRequestException, ConflictException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AccessScopeLevel, CompanyStatus, CompanyUnitType, MembershipRole, MembershipStatus, Prisma, SubscriptionStatus, SystemRole, UserStatus } from '@prisma/client';

import { AppRole } from '../../../common/enums/app-role.enum';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { normalizeEmail } from '../../../common/utils/email.util';
import { cleanOptional } from '../../../common/utils/string-normalization.util';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthService } from '../../auth/auth.service';
import { AuthMailService } from '../../auth/services/auth-mail.service';
import { WorkspaceAuditLogsService } from '../audit-logs/workspace-audit-logs.service';
import { CreateWorkspaceUserDto } from './dto/create-workspace-user.dto';
import { UpdateWorkspaceUserDto } from './dto/update-workspace-user.dto';
import { mapWorkspaceUserMemberships } from './mappers/workspace-user.mapper';
import { WorkspaceUserMembershipInclude } from './prisma/workspace-user.include';

@Injectable()
export class WorkspaceUsersService {
  private readonly logger = new Logger(WorkspaceUsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
    private readonly authMailService: AuthMailService,
    private readonly auditLogsService: WorkspaceAuditLogsService,
  ) {}

  async findAll(user: AuthUser) {
    const manageableCompanyIds = await this.getManageableCompanyIds(user);

    if (manageableCompanyIds.length === 0) {
      return [];
    }

    const memberships = await this.prisma.membership.findMany({
      where: {
        companyId: { in: manageableCompanyIds },
        role: MembershipRole.USER,
        status: { not: MembershipStatus.REMOVED },
        user: {
          systemRole: SystemRole.STANDARD,
        },
      },
      include: WorkspaceUserMembershipInclude,
      orderBy: [{ user: { name: 'asc' } }, { companyId: 'asc' }],
    });

    return mapWorkspaceUserMemberships(memberships);
  }

  async create(user: AuthUser, dto: CreateWorkspaceUserDto) {
    const { assignments, manageableCompanyIds } = await this.validateAssignments(user, dto);
    const actor = await this.getActor(user.id);
    const normalizedEmail = normalizeEmail(dto.email) as string;
    const existingUser = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    });

    if (existingUser) {
      throw new ConflictException('Email is already in use.');
    }

    const createdUser = await this.prisma.$transaction(async (tx) => {
      const workspaceUser = await tx.user.create({
        data: {
          email: normalizedEmail,
          passwordHash: null,
          name: dto.name.trim(),
          contactNumber: cleanOptional(dto.contactNumber),
          systemRole: SystemRole.STANDARD,
          status: UserStatus.PENDING_VERIFICATION,
        },
      });

      await this.replaceAssignments(tx, {
        actorUserId: user.id,
        manageableCompanyIds,
        targetUserId: workspaceUser.id,
        assignments,
      });

      await tx.$executeRaw`
        UPDATE "users"
        SET "updated_at" = NULL
        WHERE "id" = ${workspaceUser.id}
      `;

      return workspaceUser;
    });

    const memberships = await this.findUserMemberships(createdUser.id);
    await this.recordUserAssignmentLogs({
      action: 'CREATE',
      actorUserId: user.id,
      assignments,
      description: `Workspace user ${createdUser.email} was invited.`,
      targetUserId: createdUser.id,
    });

    if (createdUser.status === UserStatus.PENDING_VERIFICATION) {
      await this.sendUserInvitationEmail(actor, createdUser, assignments);
    }

    return mapWorkspaceUserMemberships(memberships)[0];
  }

  async update(user: AuthUser, userId: number, dto: UpdateWorkspaceUserDto) {
    const { assignments, manageableCompanyIds } = await this.validateAssignments(user, dto);
    const normalizedEmail = normalizeEmail(dto.email) as string;
    const existingUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, status: true },
    });

    if (!existingUser) {
      throw new NotFoundException('Workspace user not found.');
    }

    const emailChanged = normalizedEmail !== existingUser.email;

    if (emailChanged && existingUser.status !== UserStatus.PENDING_VERIFICATION) {
      throw new BadRequestException('Email can only be changed before the user activates the account.');
    }

    if (emailChanged) {
      const userWithNewEmail = await this.prisma.user.findUnique({
        where: { email: normalizedEmail },
        select: { id: true },
      });

      if (userWithNewEmail) {
        throw new ConflictException('Email is already in use.');
      }
    }

    const updatedUser = await this.prisma.$transaction(async (tx) => {
      const workspaceUser = await tx.user.update({
        where: { id: userId },
        data: {
          email: emailChanged ? normalizedEmail : undefined,
          name: dto.name.trim(),
          contactNumber: cleanOptional(dto.contactNumber),
        },
      });

      if (emailChanged) {
        await tx.userAuthIdentity.updateMany({
          where: { userId: workspaceUser.id },
          data: { email: normalizedEmail },
        });
      }

      await this.replaceAssignments(tx, {
        actorUserId: user.id,
        manageableCompanyIds,
        targetUserId: workspaceUser.id,
        assignments,
      });

      return workspaceUser;
    });

    const memberships = await this.findUserMemberships(updatedUser.id);
    await this.recordUserAssignmentLogs({
      action: 'UPDATE',
      actorUserId: user.id,
      assignments,
      description: `Workspace user ${updatedUser.email} was updated.`,
      targetUserId: updatedUser.id,
    });

    if (emailChanged && updatedUser.status === UserStatus.PENDING_VERIFICATION) {
      const actor = await this.getActor(user.id);
      await this.sendUserInvitationEmail(actor, updatedUser, assignments);
    }

    return mapWorkspaceUserMemberships(memberships)[0];
  }

  async resendInvitation(user: AuthUser, userId: number) {
    const manageableCompanyIds = await this.getManageableCompanyIds(user);

    if (manageableCompanyIds.length === 0) {
      throw new ForbiddenException('Admin access is required to resend invites.');
    }

    const targetUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        status: true,
        memberships: {
          where: {
            companyId: { in: manageableCompanyIds },
            status: { not: MembershipStatus.REMOVED },
          },
          select: {
            company: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    if (!targetUser || targetUser.memberships.length === 0) {
      throw new NotFoundException('Workspace user not found.');
    }

    if (targetUser.status !== UserStatus.PENDING_VERIFICATION) {
      throw new BadRequestException('Invitation can only be resent to pending users.');
    }

    const actor = await this.getActor(user.id);
    await this.sendUserInvitationEmail(
      actor,
      targetUser,
      targetUser.memberships.map((membership) => membership.company.name),
    );
    await this.recordUserAssignmentLogs({
      action: 'CREATE',
      actorUserId: user.id,
      assignments: manageableCompanyIds.map((companyId) => ({
        accessScope: AccessScopeLevel.COMPANY,
        companyId,
        unitIds: [],
      })),
      description: `Invitation was resent to ${targetUser.email}.`,
      targetUserId: targetUser.id,
    });

    return {
      message: `Invitation sent to ${targetUser.email}.`,
    };
  }

  async cancelInvitation(user: AuthUser, userId: number) {
    const manageableCompanyIds = await this.getManageableCompanyIds(user);

    if (manageableCompanyIds.length === 0) {
      throw new ForbiddenException('Admin access is required to cancel invites.');
    }

    const targetUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        status: true,
        memberships: {
          where: {
            status: { not: MembershipStatus.REMOVED },
          },
          select: {
            companyId: true,
          },
        },
      },
    });

    if (!targetUser || targetUser.memberships.length === 0) {
      throw new NotFoundException('Workspace user not found.');
    }

    if (targetUser.status !== UserStatus.PENDING_VERIFICATION) {
      throw new BadRequestException('Only pending invitations can be cancelled.');
    }

    const manageableCompanyIdSet = new Set(manageableCompanyIds);
    const hasBlockedMembership = targetUser.memberships.some((membership) => !manageableCompanyIdSet.has(membership.companyId));

    if (hasBlockedMembership) {
      throw new ForbiddenException('Admin access is required for every company assigned to this pending user.');
    }

    await this.recordUserAssignmentLogs({
      action: 'DELETE',
      actorUserId: user.id,
      assignments: targetUser.memberships.map((membership) => ({
        accessScope: AccessScopeLevel.COMPANY,
        companyId: membership.companyId,
        unitIds: [],
      })),
      description: `Invitation for ${targetUser.email} was cancelled.`,
    });

    await this.prisma.user.delete({
      where: { id: targetUser.id },
    });

    return {
      id: targetUser.id,
      message: `Invitation for ${targetUser.email} was cancelled.`,
    };
  }

  private async validateAssignments(user: AuthUser, dto: CreateWorkspaceUserDto | UpdateWorkspaceUserDto) {
    const assignments = dto.companyAssignments.map((assignment) => {
      const unitMap = new Map<number, number | null>();
      if (assignment.unitAssignments) {
        for (const ua of assignment.unitAssignments) {
          unitMap.set(ua.unitId, ua.companyRoleId ?? null);
        }
      }
      const rawUnitIds = assignment.unitIds ?? assignment.unitAssignments?.map((u) => u.unitId) ?? [];
      const unitIds = [...new Set(rawUnitIds)];
      return {
        companyId: assignment.companyId,
        unitIds,
        unitAssignments: unitIds.map((unitId) => ({
          unitId,
          companyRoleId: unitMap.get(unitId) ?? assignment.companyRoleId ?? null,
        })),
        role: assignment.role,
        companyRoleId: assignment.companyRoleId,
      };
    });

    const companyIds = [...new Set(assignments.map(({ companyId }) => companyId))];

    if (companyIds.length !== assignments.length) {
      throw new BadRequestException('Company assignments must be unique.');
    }

    await this.ensureCanManageCompanies(user, companyIds);

    const companies = await this.prisma.company.findMany({
      where: {
        id: { in: companyIds },
      },
      select: {
        id: true,
        name: true,
        isActive: true,
        status: true,
        subscriptions: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: { status: true },
        },
      },
    });

    for (const company of companies) {
      if (!company.isActive || company.status !== CompanyStatus.ACTIVE) {
        throw new BadRequestException(`Cannot assign users to company ${company.name} because it is inactive.`);
      }

      const latestSub = company.subscriptions?.[0];
      if (
        latestSub &&
        latestSub.status !== SubscriptionStatus.ACTIVE &&
        latestSub.status !== SubscriptionStatus.TRIALING
      ) {
        throw new BadRequestException(
          `Cannot assign users to company ${company.name} because its subscription is ${latestSub.status.toLowerCase().replace('_', ' ')}.`,
        );
      }
    }

    const units = await this.prisma.companyUnit.findMany({

      where: {
        id: { in: assignments.flatMap(({ unitIds }) => unitIds) },
        isActive: true,
      },
      select: { id: true, companyId: true, type: true },
    });

    const unitById = new Map(units.map((unit) => [unit.id, unit]));

    for (const assignment of assignments) {
      if (assignment.unitIds.length === 0) {
        throw new BadRequestException('Select at least one head office, branch, or satellite.');
      }

      for (const unitId of assignment.unitIds) {
        const unit = unitById.get(unitId);

        if (!unit || unit.companyId !== assignment.companyId) {
          throw new BadRequestException('Selected branch or satellite does not belong to the selected company.');
        }
      }
    }

    return {
      assignments: assignments.map((assignment) => ({
        ...assignment,
        role: assignment.role ?? MembershipRole.USER,
        companyRoleId: assignment.companyRoleId ?? null,
        accessScope: getAccessScope(assignment.unitIds.map((unitId) => unitById.get(unitId)?.type)),
      })),
      manageableCompanyIds: await this.getManageableCompanyIds(user),
    };
  }

  private async replaceAssignments(
    tx: Prisma.TransactionClient,
    input: {
      actorUserId: number;
      manageableCompanyIds: number[];
      targetUserId: number;
      assignments: {
        companyId: number;
        unitIds: number[];
        unitAssignments: { unitId: number; companyRoleId: number | null }[];
        accessScope: AccessScopeLevel;
        role?: MembershipRole;
        companyRoleId?: number | null;
      }[];
    },
  ) {
    const assignedCompanyIds = input.assignments.map(({ companyId }) => companyId);

    await tx.membership.deleteMany({
      where: {
        userId: input.targetUserId,
        companyId: {
          in: input.manageableCompanyIds.filter((companyId) => !assignedCompanyIds.includes(companyId)),
        },
      },
    });

    for (const assignment of input.assignments) {
      const role = assignment.role ?? MembershipRole.USER;
      const primaryCompanyRoleId = assignment.unitAssignments[0]?.companyRoleId ?? assignment.companyRoleId ?? null;

      await tx.membership.upsert({
        where: {
          userId_companyId: {
            userId: input.targetUserId,
            companyId: assignment.companyId,
          },
        },
        update: {
          role,
          companyRoleId: primaryCompanyRoleId,
          status: MembershipStatus.ACTIVE,
          accessScope: assignment.accessScope,
          invitedByUserId: input.actorUserId,
          invitedAt: new Date(),
        },
        create: {
          userId: input.targetUserId,
          companyId: assignment.companyId,
          role,
          companyRoleId: primaryCompanyRoleId,
          status: MembershipStatus.ACTIVE,
          accessScope: assignment.accessScope,
          invitedByUserId: input.actorUserId,
          invitedAt: new Date(),
        },
      });

      await tx.membershipUnitAccess.deleteMany({
        where: {
          userId: input.targetUserId,
          companyId: assignment.companyId,
        },
      });

      await tx.membershipUnitAccess.createMany({
        data: assignment.unitAssignments.map(({ unitId, companyRoleId }) => ({
          userId: input.targetUserId,
          companyId: assignment.companyId,
          unitId,
          companyRoleId: companyRoleId ?? null,
        })),
        skipDuplicates: true,
      });
    }
  }



  private async findUserMemberships(userId: number) {
    return this.prisma.membership.findMany({
      where: {
        userId,
        status: { not: MembershipStatus.REMOVED },
      },
      include: WorkspaceUserMembershipInclude,
      orderBy: { companyId: 'asc' },
    });
  }

  private async recordUserAssignmentLogs(input: {
    action: string;
    actorUserId: number;
    assignments: {
      companyId: number;
      unitIds: number[];
      accessScope: AccessScopeLevel;
    }[];
    description: string;
    targetUserId?: number;
  }) {
    const unitIds = input.assignments.flatMap((assignment) => assignment.unitIds);
    const units =
      unitIds.length > 0
        ? await this.prisma.companyUnit.findMany({
            where: { id: { in: unitIds } },
            select: { id: true, name: true },
          })
        : [];
    const unitNameById = new Map(units.map((unit) => [unit.id, unit.name]));

    for (const assignment of input.assignments) {
      const branchNames = assignment.unitIds.map((unitId) => unitNameById.get(unitId)).filter(Boolean);

      await this.auditLogsService.record({
        actorUserId: input.actorUserId,
        action: input.action,
        companyId: assignment.companyId,
        entityType: 'WorkspaceUser',
        entityId: input.targetUserId,
        metadata: {
          branchId: assignment.unitIds.length === 1 ? String(assignment.unitIds[0]) : 'workspace',
          branchName: branchNames.length === 1 ? branchNames[0] : branchNames.length > 1 ? 'Multiple branches' : 'Workspace',
          description: input.description,
          module: 'User Management',
        },
      });
    }
  }

  private async getManageableCompanyIds(user: AuthUser) {
    if (user.role === AppRole.SUPER_ADMIN) {
      const companies = await this.prisma.company.findMany({
        select: { id: true },
      });

      return companies.map((company) => company.id);
    }

    const memberships = await this.prisma.membership.findMany({
      where: {
        userId: user.id,
        role: MembershipRole.ADMIN,
        status: MembershipStatus.ACTIVE,
      },
      select: { companyId: true },
    });

    return memberships.map((membership) => membership.companyId);
  }

  private async ensureCanManageCompanies(user: AuthUser, companyIds: number[]) {
    if (user.role === AppRole.SUPER_ADMIN) {
      return;
    }

    const manageableCompanyIds = await this.getManageableCompanyIds(user);
    const manageableCompanyIdSet = new Set(manageableCompanyIds);
    const hasBlockedCompany = companyIds.some((companyId) => !manageableCompanyIdSet.has(companyId));

    if (hasBlockedCompany) {
      throw new ForbiddenException('Admin access is required for every selected company.');
    }
  }

  private async getActor(userId: number) {
    const actor = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    });

    if (!actor) {
      throw new ForbiddenException('Sign in again before managing users.');
    }

    return actor;
  }

  private async sendUserInvitationEmail(
    actor: { email: string; name: string },
    user: { id: number; email: string; name: string },
    assignmentsOrCompanyNames: { companyId: number }[] | string[],
  ) {
    const companyNames =
      typeof assignmentsOrCompanyNames[0] === 'string'
        ? (assignmentsOrCompanyNames as string[])
        : await this.getCompanyNamesForAssignments(assignmentsOrCompanyNames as { companyId: number }[]);
    const inviteToken = await this.authService.createWorkspaceInviteToken(user.id, user.email);
    const activationUrl = this.buildActivationUrl(user.email, inviteToken.rawToken);

    void this.authMailService.sendWorkspaceUserInvitation(user.email, user.name, actor.name, companyNames, activationUrl).catch((error: unknown) => {
      this.logger.warn(`Unable to queue workspace invitation email for user ${user.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    });
  }

  private async getCompanyNamesForAssignments(assignments: { companyId: number }[]) {
    const companies = await this.prisma.company.findMany({
      where: { id: { in: assignments.map(({ companyId }) => companyId) } },
      select: { name: true },
      orderBy: { name: 'asc' },
    });

    return companies.map((company) => company.name);
  }

  private buildActivationUrl(email: string, token: string) {
    const frontendUrl = this.resolveFrontendUrl();
    const url = new URL('/activate-account', frontendUrl);
    url.searchParams.set('email', email);
    url.searchParams.set('token', token);

    return url.toString();
  }

  private resolveFrontendUrl() {
    const appEnvironment = this.configService.get<string>('APP_ENV', 'local');
    const configuredUrl = this.configService.get<string>('FRONTEND_URL')?.trim();
    const corsOrigin = this.getFirstCorsAllowedOrigin();

    if (configuredUrl) {
      return configuredUrl.replace(/\/+$/, '');
    }

    if (corsOrigin) {
      return corsOrigin.replace(/\/+$/, '');
    }

    if (appEnvironment === 'local') {
      return 'http://localhost:3001';
    }

    throw new Error('A frontend origin is required before sending workspace user invitations. Set FRONTEND_URL or CORS_ALLOWED_ORIGINS.');
  }

  private getFirstCorsAllowedOrigin() {
    return this.configService
      .get<string>('CORS_ALLOWED_ORIGINS', '')
      .split(',')
      .map((origin) => origin.trim())
      .find((origin) => origin && origin !== '*');
  }
}

function getAccessScope(types: Array<CompanyUnitType | undefined>): AccessScopeLevel {
  if (types.every((type) => type === CompanyUnitType.SATELLITE)) {
    return AccessScopeLevel.SATELLITE;
  }

  return AccessScopeLevel.BRANCH;
}
