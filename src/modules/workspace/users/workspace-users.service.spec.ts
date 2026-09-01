import { BadRequestException } from '@nestjs/common';
import { AccessScopeLevel, CompanyStatus, CompanyUnitType, MembershipRole, MembershipStatus, SubscriptionStatus, UserStatus } from '@prisma/client';
import { AppRole } from '../../../common/enums/app-role.enum';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';
import type { CreateWorkspaceUserDto } from './dto/create-workspace-user.dto';
import { WorkspaceUsersService } from './workspace-users.service';

describe('WorkspaceUsersService', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it.each([
    {
      company: buildCompany({ isActive: false }),
      expectedMessage: 'Cannot assign users to company Acme because it is inactive.',
    },
    {
      company: buildCompany({ status: CompanyStatus.SUSPENDED }),
      expectedMessage: 'Cannot assign users to company Acme because it is inactive.',
    },
  ])('rejects assignments to an inactive company', async ({ company, expectedMessage }) => {
    const { prisma, service } = createService();
    prisma.company.findMany.mockResolvedValue([company]);

    await expect(service.create(buildActor(), buildCreateDto())).rejects.toThrow(new BadRequestException(expectedMessage));
    expect(prisma.companyUnit.findMany).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects assignments when the latest company subscription is unusable', async () => {
    const { prisma, service } = createService();
    prisma.company.findMany.mockResolvedValue([
      buildCompany({
        subscriptions: [{ status: SubscriptionStatus.PAST_DUE }],
      }),
    ]);

    await expect(service.create(buildActor(), buildCreateDto())).rejects.toThrow(
      new BadRequestException('Cannot assign users to company Acme because its subscription is past due.'),
    );
    expect(prisma.companyUnit.findMany).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('persists membership and per-unit roles for a trialing company', async () => {
    const assignmentTimestamp = new Date('2026-01-01T00:00:00.000Z');
    jest.useFakeTimers().setSystemTime(assignmentTimestamp);
    const { prisma, service, tx } = createService();
    prisma.company.findMany
      .mockResolvedValueOnce([
        buildCompany({
          subscriptions: [{ status: SubscriptionStatus.TRIALING }],
        }),
      ])
      .mockResolvedValueOnce([{ id: 20 }]);
    prisma.companyUnit.findMany
      .mockResolvedValueOnce([
        { id: 10, companyId: 20, type: CompanyUnitType.HEAD_OFFICE },
        { id: 11, companyId: 20, type: CompanyUnitType.BRANCH },
      ])
      .mockResolvedValueOnce([
        { id: 10, name: 'Head Office' },
        { id: 11, name: 'North Branch' },
      ]);
    prisma.user.findUnique.mockResolvedValueOnce({ email: 'admin@example.com', name: 'Admin User' }).mockResolvedValueOnce(null);
    prisma.membership.findMany.mockResolvedValue([]);
    tx.user.create.mockResolvedValue({
      id: 50,
      email: 'new.user@example.com',
      name: 'New User',
      status: UserStatus.ACTIVE,
    });

    await service.create(buildActor(), buildCreateDto());

    expect(tx.membership.upsert).toHaveBeenCalledWith({
      where: {
        userId_companyId: {
          userId: 50,
          companyId: 20,
        },
      },
      update: {
        role: MembershipRole.ADMIN,
        companyRoleId: 100,
        status: MembershipStatus.ACTIVE,
        accessScope: AccessScopeLevel.BRANCH,
        invitedByUserId: 7,
        invitedAt: assignmentTimestamp,
      },
      create: {
        userId: 50,
        companyId: 20,
        role: MembershipRole.ADMIN,
        companyRoleId: 100,
        status: MembershipStatus.ACTIVE,
        accessScope: AccessScopeLevel.BRANCH,
        invitedByUserId: 7,
        invitedAt: assignmentTimestamp,
      },
    });
    expect(tx.membershipUnitAccess.createMany).toHaveBeenCalledWith({
      data: [
        { userId: 50, companyId: 20, unitId: 10, companyRoleId: 100 },
        { userId: 50, companyId: 20, unitId: 11, companyRoleId: 200 },
      ],
      skipDuplicates: true,
    });
  });
});

function createService() {
  const tx = {
    user: {
      create: jest.fn(),
    },
    membership: {
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      upsert: jest.fn(),
    },
    membershipUnitAccess: {
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      createMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    $executeRaw: jest.fn().mockResolvedValue(1),
  };
  const prisma = {
    company: {
      findMany: jest.fn(),
    },
    companyUnit: {
      findMany: jest.fn(),
    },
    membership: {
      findMany: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
  };
  const auditLogsService = {
    record: jest.fn().mockResolvedValue(undefined),
  };
  const service = new WorkspaceUsersService(prisma as never, {} as never, {} as never, {} as never, auditLogsService as never);

  return { prisma, service, tx };
}

function buildActor() {
  return {
    id: 7,
    role: AppRole.SUPER_ADMIN,
  } as AuthUser;
}

function buildCreateDto(): CreateWorkspaceUserDto {
  return {
    name: ' New User ',
    email: 'NEW.USER@EXAMPLE.COM',
    companyAssignments: [
      {
        companyId: 20,
        unitIds: [10, 11],
        unitAssignments: [
          { unitId: 10, companyRoleId: 100 },
          { unitId: 11, companyRoleId: 200 },
        ],
        role: MembershipRole.ADMIN,
        companyRoleId: 999,
      },
    ],
  };
}

function buildCompany({
  isActive = true,
  status = CompanyStatus.ACTIVE,
  subscriptions = [],
}: {
  isActive?: boolean;
  status?: CompanyStatus;
  subscriptions?: Array<{ status: SubscriptionStatus }>;
} = {}) {
  return {
    id: 20,
    name: 'Acme',
    isActive,
    status,
    subscriptions,
  };
}
