import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AccessScopeLevel,
  CompanyUnitType,
  MembershipRole,
  MembershipStatus,
  Prisma,
  SystemRole,
  UserStatus,
} from '@prisma/client';
import { AppRole } from '../../../common/enums/app-role.enum';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { normalizeEmail } from '../../../common/utils/email.util';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthService } from '../../auth/auth.service';
import { AuthMailService } from '../../auth/services/auth-mail.service';
import { CreateWorkspaceUserDto } from './dto/create-workspace-user.dto';
import { UpdateWorkspaceUserDto } from './dto/update-workspace-user.dto';
import { mapWorkspaceUserMemberships } from './mappers/workspace-user.mapper';
import { WorkspaceUserMembershipInclude } from './prisma/workspace-user.include';

@Injectable()
export class WorkspaceUsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
    private readonly authMailService: AuthMailService,
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
    const { assignments, manageableCompanyIds } =
      await this.validateAssignments(user, dto);
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

      return workspaceUser;
    });

    const memberships = await this.findUserMemberships(createdUser.id);

    if (createdUser.status === UserStatus.PENDING_VERIFICATION) {
      await this.sendUserInvitationEmail(actor, createdUser, assignments);
    }

    return mapWorkspaceUserMemberships(memberships)[0];
  }

  async update(user: AuthUser, userId: number, dto: UpdateWorkspaceUserDto) {
    const { assignments, manageableCompanyIds } =
      await this.validateAssignments(user, dto);
    const normalizedEmail = normalizeEmail(dto.email) as string;
    const existingUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, status: true },
    });

    if (!existingUser) {
      throw new NotFoundException('Workspace user not found.');
    }

    const emailChanged = normalizedEmail !== existingUser.email;

    if (
      emailChanged &&
      existingUser.status !== UserStatus.PENDING_VERIFICATION
    ) {
      throw new BadRequestException(
        'Email can only be changed before the user activates the account.',
      );
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

    if (
      emailChanged &&
      updatedUser.status === UserStatus.PENDING_VERIFICATION
    ) {
      const actor = await this.getActor(user.id);
      await this.sendUserInvitationEmail(actor, updatedUser, assignments);
    }

    return mapWorkspaceUserMemberships(memberships)[0];
  }

  async resendInvitation(user: AuthUser, userId: number) {
    const manageableCompanyIds = await this.getManageableCompanyIds(user);

    if (manageableCompanyIds.length === 0) {
      throw new ForbiddenException(
        'Admin access is required to resend invites.',
      );
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
      throw new BadRequestException(
        'Invitation can only be resent to pending users.',
      );
    }

    const actor = await this.getActor(user.id);
    await this.sendUserInvitationEmail(
      actor,
      targetUser,
      targetUser.memberships.map((membership) => membership.company.name),
    );

    return {
      message: `Invitation sent to ${targetUser.email}.`,
    };
  }

  async cancelInvitation(user: AuthUser, userId: number) {
    const manageableCompanyIds = await this.getManageableCompanyIds(user);

    if (manageableCompanyIds.length === 0) {
      throw new ForbiddenException(
        'Admin access is required to cancel invites.',
      );
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
      throw new BadRequestException(
        'Only pending invitations can be cancelled.',
      );
    }

    const manageableCompanyIdSet = new Set(manageableCompanyIds);
    const hasBlockedMembership = targetUser.memberships.some(
      (membership) => !manageableCompanyIdSet.has(membership.companyId),
    );

    if (hasBlockedMembership) {
      throw new ForbiddenException(
        'Admin access is required for every company assigned to this pending user.',
      );
    }

    await this.prisma.user.delete({
      where: { id: targetUser.id },
    });

    return {
      id: targetUser.id,
      message: `Invitation for ${targetUser.email} was cancelled.`,
    };
  }

  private async validateAssignments(
    user: AuthUser,
    dto: CreateWorkspaceUserDto | UpdateWorkspaceUserDto,
  ) {
    const assignments = dto.companyAssignments.map((assignment) => ({
      companyId: assignment.companyId,
      unitIds: [...new Set(assignment.unitIds)],
    }));
    const companyIds = [
      ...new Set(assignments.map(({ companyId }) => companyId)),
    ];

    if (companyIds.length !== assignments.length) {
      throw new BadRequestException('Company assignments must be unique.');
    }

    await this.ensureCanManageCompanies(user, companyIds);

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
        throw new BadRequestException(
          'Select at least one head office, branch, or satellite.',
        );
      }

      for (const unitId of assignment.unitIds) {
        const unit = unitById.get(unitId);

        if (!unit || unit.companyId !== assignment.companyId) {
          throw new BadRequestException(
            'Selected branch or satellite does not belong to the selected company.',
          );
        }
      }
    }

    return {
      assignments: assignments.map((assignment) => ({
        ...assignment,
        accessScope: getAccessScope(
          assignment.unitIds.map((unitId) => unitById.get(unitId)?.type),
        ),
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
        accessScope: AccessScopeLevel;
      }[];
    },
  ) {
    const assignedCompanyIds = input.assignments.map(
      ({ companyId }) => companyId,
    );

    await tx.membership.deleteMany({
      where: {
        userId: input.targetUserId,
        companyId: {
          in: input.manageableCompanyIds.filter(
            (companyId) => !assignedCompanyIds.includes(companyId),
          ),
        },
      },
    });

    for (const assignment of input.assignments) {
      await tx.membership.upsert({
        where: {
          userId_companyId: {
            userId: input.targetUserId,
            companyId: assignment.companyId,
          },
        },
        update: {
          status: MembershipStatus.ACTIVE,
          accessScope: assignment.accessScope,
          invitedByUserId: input.actorUserId,
          invitedAt: new Date(),
        },
        create: {
          userId: input.targetUserId,
          companyId: assignment.companyId,
          role: MembershipRole.USER,
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
        data: assignment.unitIds.map((unitId) => ({
          userId: input.targetUserId,
          companyId: assignment.companyId,
          unitId,
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
    const hasBlockedCompany = companyIds.some(
      (companyId) => !manageableCompanyIdSet.has(companyId),
    );

    if (hasBlockedCompany) {
      throw new ForbiddenException(
        'Admin access is required for every selected company.',
      );
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
        : await this.getCompanyNamesForAssignments(
            assignmentsOrCompanyNames as { companyId: number }[],
          );
    const inviteToken = await this.authService.createWorkspaceInviteToken(
      user.id,
      user.email,
    );
    const activationUrl = this.buildActivationUrl(
      user.email,
      inviteToken.rawToken,
    );

    await this.authMailService.sendWorkspaceUserInvitation(
      user.email,
      user.name,
      actor.name,
      companyNames,
      activationUrl,
    );
  }

  private async getCompanyNamesForAssignments(
    assignments: { companyId: number }[],
  ) {
    const companies = await this.prisma.company.findMany({
      where: { id: { in: assignments.map(({ companyId }) => companyId) } },
      select: { name: true },
      orderBy: { name: 'asc' },
    });

    return companies.map((company) => company.name);
  }

  private buildActivationUrl(email: string, token: string) {
    const frontendUrl = this.configService
      .get<string>('FRONTEND_URL', 'http://localhost:3001')
      .replace(/\/+$/, '');
    const url = new URL('/activate-account', frontendUrl);
    url.searchParams.set('email', email);
    url.searchParams.set('token', token);

    return url.toString();
  }
}

function cleanOptional(value: string | undefined) {
  const cleaned = value?.trim();
  return cleaned ? cleaned : null;
}

function getAccessScope(
  types: Array<CompanyUnitType | undefined>,
): AccessScopeLevel {
  if (types.every((type) => type === CompanyUnitType.SATELLITE)) {
    return AccessScopeLevel.SATELLITE;
  }

  return AccessScopeLevel.BRANCH;
}
