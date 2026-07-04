import { UnauthorizedException } from '@nestjs/common';
import {
  AccessScopeLevel,
  CompanyStatus,
  MembershipRole,
  MembershipStatus,
  SubscriptionStatus,
  SystemRole,
  UserStatus,
} from '@prisma/client';
import { AppRole } from '../../enums/app-role.enum';
import { CompanyAccessResolver } from './company-access-resolver.service';

type TestCompany = {
  id: number;
  isActive: boolean;
  status: CompanyStatus;
  subscriptions: Array<{
    status: SubscriptionStatus;
    trialEndsAt: Date | null;
    endsAt: Date | null;
    failureCode?: string | null;
  }>;
  units: unknown[];
  moduleSidebar: unknown[];
};

describe('CompanyAccessResolver', () => {
  it('returns active user context without loading membership when no company is selected', async () => {
    const { resolver, prisma } = createResolver();

    await expect(
      resolver.resolve(buildPayload({ companyId: null })),
    ).resolves.toEqual({
      user: {
        id: 7,
        systemRole: SystemRole.STANDARD,
      },
      membership: null,
    });
    expect(prisma.membership.findUnique).not.toHaveBeenCalled();
  });

  it('loads and returns active membership context for selected company', async () => {
    const membership = buildMembership();
    const { resolver, prisma } = createResolver({ membership });

    await expect(resolver.resolve(buildPayload())).resolves.toEqual({
      user: {
        id: 7,
        systemRole: SystemRole.STANDARD,
      },
      membership,
    });
    expect(prisma.membership.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId_companyId: {
            userId: 7,
            companyId: 57,
          },
        },
      }),
    );
  });

  it('rejects inactive users', async () => {
    const { resolver } = createResolver({
      user: {
        id: 7,
        status: UserStatus.PENDING_VERIFICATION,
        systemRole: SystemRole.STANDARD,
      },
    });

    await expect(resolver.resolve(buildPayload())).rejects.toThrow(
      new UnauthorizedException('User account is not active.'),
    );
  });

  it('rejects missing company membership', async () => {
    const { resolver } = createResolver({ membership: null });

    await expect(resolver.resolve(buildPayload())).rejects.toThrow(
      new UnauthorizedException('You do not belong to this company.'),
    );
  });

  it('rejects inactive memberships', async () => {
    const { resolver } = createResolver({
      membership: buildMembership({ status: MembershipStatus.SUSPENDED }),
    });

    await expect(resolver.resolve(buildPayload())).rejects.toThrow(
      new UnauthorizedException('Your company membership is not active.'),
    );
  });

  it('rejects unavailable companies', async () => {
    const { resolver } = createResolver({
      membership: buildMembership({
        company: {
          ...buildCompany(),
          status: CompanyStatus.SUSPENDED,
        },
      }),
    });

    await expect(resolver.resolve(buildPayload())).rejects.toThrow(
      new UnauthorizedException('This company is unavailable.'),
    );
  });

  it('rejects inactive companies', async () => {
    const { resolver } = createResolver({
      membership: buildMembership({
        company: {
          ...buildCompany(),
          isActive: false,
        },
      }),
    });

    await expect(resolver.resolve(buildPayload())).rejects.toThrow(
      new UnauthorizedException('This company is inactive.'),
    );
  });

  it('preserves subscription access denial behavior', async () => {
    const { resolver } = createResolver({
      membership: buildMembership({
        company: {
          ...buildCompany(),
          subscriptions: [
            {
              status: SubscriptionStatus.PAST_DUE,
              trialEndsAt: null,
              endsAt: null,
            },
          ],
        },
      }),
    });

    await expect(resolver.resolve(buildPayload())).rejects.toThrow(
      new UnauthorizedException('This company subscription is past due.'),
    );
  });
});

function createResolver({
  user = {
    id: 7,
    status: UserStatus.ACTIVE,
    systemRole: SystemRole.STANDARD,
  },
  membership = buildMembership(),
}: {
  user?: { id: number; status: UserStatus; systemRole: SystemRole } | null;
  membership?: ReturnType<typeof buildMembership> | null;
} = {}) {
  const prisma = {
    user: {
      findUnique: jest.fn().mockResolvedValue(user),
    },
    membership: {
      findUnique: jest.fn().mockResolvedValue(membership),
    },
  };
  const configService = {
    get: jest.fn().mockReturnValue('false'),
  };

  return {
    resolver: new CompanyAccessResolver(
      prisma as never,
      configService as never,
    ),
    prisma,
    configService,
  };
}

function buildPayload({
  companyId = 57,
}: {
  companyId?: number | null;
} = {}) {
  return {
    sub: 7,
    companyId,
    role: AppRole.USER,
    systemRole: SystemRole.STANDARD,
    membershipRole: MembershipRole.ADMIN,
    companyRoleId: null,
  };
}

function buildMembership({
  status = MembershipStatus.ACTIVE,
  company = buildCompany(),
}: {
  status?: MembershipStatus;
  company?: TestCompany;
} = {}) {
  return {
    userId: 7,
    companyId: 57,
    role: MembershipRole.ADMIN,
    status,
    accessScope: AccessScopeLevel.COMPANY,
    companyRole: null,
    unitAccess: [],
    permissionOverrides: [],
    company,
  };
}

function buildCompany(): TestCompany {
  return {
    id: 57,
    isActive: true,
    status: CompanyStatus.ACTIVE,
    subscriptions: [],
    units: [],
    moduleSidebar: [],
  };
}
