import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { CompanyStatus, MembershipRole, MembershipStatus, Prisma, SubscriptionStatus, SystemRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';

type RegistrationFailure = 'user' | 'verification' | 'unique';

type FakeTransaction = {
  user: {
    findUnique: jest.Mock;
    create: jest.Mock;
  };
  emailVerificationCode: {
    create: jest.Mock;
  };
};

function createRegistrationHarness(failure?: RegistrationFailure) {
  const users: Array<Record<string, unknown>> = [];
  const verificationCodes: Array<Record<string, unknown>> = [];
  const sendVerificationCode = jest.fn().mockResolvedValue(undefined);

  const transaction = jest.fn(async (callback: (tx: FakeTransaction) => Promise<unknown>) => {
    const stagedUsers = users.map((user) => ({ ...user }));
    const stagedVerificationCodes = verificationCodes.map((code) => ({ ...code }));
    const tx: FakeTransaction = {
      user: {
        findUnique: jest.fn(({ where }: { where: { email: string } }) => stagedUsers.find((user) => user.email === where.email) ?? null),
        create: jest.fn(({ data }: { data: Record<string, unknown> }) => {
          if (failure === 'user') {
            throw new Error('user creation failed');
          }

          if (failure === 'unique') {
            throw new Prisma.PrismaClientKnownRequestError('unique constraint failed', {
              code: 'P2002',
              clientVersion: '6.19.3',
            });
          }

          const createdUser = {
            id: stagedUsers.length + 1,
            ...data,
          };
          stagedUsers.push(createdUser);
          return createdUser;
        }),
      },
      emailVerificationCode: {
        create: jest.fn(({ data }: { data: Record<string, unknown> }) => {
          if (failure === 'verification') {
            throw new Error('verification code creation failed');
          }

          stagedVerificationCodes.push({ id: stagedVerificationCodes.length + 1, ...data });
          return stagedVerificationCodes.at(-1);
        }),
      },
    };

    const result = await callback(tx);
    users.splice(0, users.length, ...stagedUsers);
    verificationCodes.splice(0, verificationCodes.length, ...stagedVerificationCodes);
    return result;
  });

  const usersService = {
    findForAuthByEmail: jest.fn(),
  };
  const otpService = {
    generateCode: jest.fn().mockReturnValue('1234'),
    hashCode: jest.fn().mockResolvedValue('hashed-code'),
    maskEmail: jest.fn().mockReturnValue('te***st@example.com'),
  };
  const service = Object.create(AuthService.prototype) as AuthService;

  Object.assign(service, {
    prisma: { $transaction: transaction },
    usersService,
    configService: { get: jest.fn().mockReturnValue(300) },
    authMailService: { sendVerificationCode },
    otpService,
    logger: { warn: jest.fn(), error: jest.fn() },
  });

  return { service, users, verificationCodes, sendVerificationCode, usersService };
}

const validRegistration = {
  fullName: 'Test User',
  email: ' Test.User@Example.com ',
  contactNumber: ' +63 900 000 0000 ',
  password: 'StrongPass1!',
  confirmPassword: 'StrongPass1!',
};

describe('AuthService registration atomicity', () => {
  it('commits the user and verification code together', async () => {
    const harness = createRegistrationHarness();

    await expect(harness.service.register(validRegistration)).resolves.toMatchObject({
      verificationRequired: true,
      email: 'test.user@example.com',
    });

    expect(harness.users).toHaveLength(1);
    expect(harness.verificationCodes).toHaveLength(1);
    expect(harness.verificationCodes[0]).toMatchObject({ userId: 1, email: 'test.user@example.com' });
    expect(harness.sendVerificationCode).toHaveBeenCalledWith('test.user@example.com', '1234');
    expect(await bcrypt.compare('StrongPass1!', String(harness.users[0].passwordHash))).toBe(true);
  });

  it.each([
    ['user creation', 'user'],
    ['verification-code creation', 'verification'],
  ] as const)('rolls back all registration records when %s fails', async (_step, failure) => {
    const harness = createRegistrationHarness(failure);

    await expect(harness.service.register(validRegistration)).rejects.toThrow();

    expect(harness.users).toHaveLength(0);
    expect(harness.verificationCodes).toHaveLength(0);
    expect(harness.sendVerificationCode).not.toHaveBeenCalled();
  });

  it('preserves duplicate-email validation inside the transaction', async () => {
    const harness = createRegistrationHarness();

    await harness.service.register(validRegistration);

    await expect(harness.service.register(validRegistration)).rejects.toBeInstanceOf(ConflictException);
    expect(harness.users).toHaveLength(1);
    expect(harness.verificationCodes).toHaveLength(1);
    expect(harness.sendVerificationCode).toHaveBeenCalledTimes(1);
  });

  it('maps a concurrent database unique-email race to the existing conflict response', async () => {
    const harness = createRegistrationHarness('unique');

    await expect(harness.service.register(validRegistration)).rejects.toBeInstanceOf(ConflictException);

    expect(harness.users).toHaveLength(0);
    expect(harness.verificationCodes).toHaveLength(0);
    expect(harness.sendVerificationCode).not.toHaveBeenCalled();
  });

  it('logs in with the password hash persisted by registration', async () => {
    const harness = createRegistrationHarness();
    await harness.service.register(validRegistration);

    const persistedUser = harness.users[0];
    harness.usersService.findForAuthByEmail.mockResolvedValue({
      id: persistedUser.id,
      email: persistedUser.email,
      name: persistedUser.name,
      passwordHash: persistedUser.passwordHash,
      systemRole: SystemRole.STANDARD,
      status: UserStatus.ACTIVE,
      emailVerifiedAt: new Date(),
      memberships: [],
    });
    Object.assign(harness.service, {
      loginActivatedUser: jest.fn().mockResolvedValue({ accessToken: 'token' }),
      recordAuthAudit: jest.fn().mockResolvedValue(undefined),
    });

    await expect(
      harness.service.login({
        email: validRegistration.email,
        password: validRegistration.password,
      }),
    ).resolves.toMatchObject({ accessToken: 'token' });
  });
});

describe('AuthService company context resolution', () => {
  const service = Object.create(AuthService.prototype) as {
    resolveDefaultCompanyContext: (user: { systemRole: string; memberships: unknown[] }, requestedCompanyId: number | null) => number | null;
    isMembershipCompanyUsable: (membership: unknown) => boolean;
    getUsableMemberships: (user: { systemRole: string; memberships: unknown[] }) => unknown[];
  };

  it('skips inactive companies when choosing the default login company', () => {
    const companyId = service.resolveDefaultCompanyContext(
      {
        systemRole: 'STANDARD',
        memberships: [
          createMembership({
            companyId: 1,
            isCompanyActive: false,
            lastAccessedAt: new Date('2026-06-17T08:00:00.000Z'),
          }),
          createMembership({
            companyId: 2,
            isCompanyActive: true,
            lastAccessedAt: new Date('2026-06-16T08:00:00.000Z'),
          }),
        ],
      },
      null,
    );

    expect(companyId).toBe(2);
  });

  it('skips companies with expired subscriptions when choosing the default login company', () => {
    const companyId = service.resolveDefaultCompanyContext(
      {
        systemRole: 'STANDARD',
        memberships: [
          createMembership({
            companyId: 1,
            isCompanyActive: true,
            subscriptionStatus: SubscriptionStatus.EXPIRED,
            lastAccessedAt: new Date('2026-06-17T08:00:00.000Z'),
          }),
          createMembership({
            companyId: 2,
            isCompanyActive: true,
            subscriptionStatus: SubscriptionStatus.ACTIVE,
            endsAt: new Date(Date.now() + 86400000),
            lastAccessedAt: new Date('2026-06-16T08:00:00.000Z'),
          }),
        ],
      },
      null,
    );

    expect(companyId).toBe(2);
  });

  it('skips companies whose active subscription endsAt is in the past', () => {
    const companyId = service.resolveDefaultCompanyContext(
      {
        systemRole: 'STANDARD',
        memberships: [
          createMembership({
            companyId: 1,
            isCompanyActive: true,
            subscriptionStatus: SubscriptionStatus.ACTIVE,
            endsAt: new Date('2026-01-01T00:00:00.000Z'), // in past
            lastAccessedAt: new Date('2026-06-17T08:00:00.000Z'),
          }),
          createMembership({
            companyId: 2,
            isCompanyActive: true,
            subscriptionStatus: SubscriptionStatus.ACTIVE,
            endsAt: new Date(Date.now() + 86400000), // in future
            lastAccessedAt: new Date('2026-06-16T08:00:00.000Z'),
          }),
        ],
      },
      null,
    );

    expect(companyId).toBe(2);
  });

  it('returns null if all companies have expired subscriptions', () => {
    const companyId = service.resolveDefaultCompanyContext(
      {
        systemRole: 'STANDARD',
        memberships: [
          createMembership({
            companyId: 1,
            isCompanyActive: true,
            subscriptionStatus: SubscriptionStatus.EXPIRED,
          }),
          createMembership({
            companyId: 2,
            isCompanyActive: true,
            subscriptionStatus: SubscriptionStatus.CANCELED,
          }),
        ],
      },
      null,
    );

    expect(companyId).toBeNull();
  });

  it('rejects an explicitly requested inactive company', () => {
    expect(() =>
      service.resolveDefaultCompanyContext(
        {
          systemRole: 'STANDARD',
          memberships: [
            createMembership({
              companyId: 1,
              isCompanyActive: false,
            }),
            createMembership({
              companyId: 2,
              isCompanyActive: true,
            }),
          ],
        },
        1,
      ),
    ).toThrow(UnauthorizedException);
  });

  it('rejects an explicitly requested expired company with specific subscription message', () => {
    expect(() =>
      service.resolveDefaultCompanyContext(
        {
          systemRole: 'STANDARD',
          memberships: [
            createMembership({
              companyId: 1,
              isCompanyActive: true,
              subscriptionStatus: SubscriptionStatus.EXPIRED,
            }),
            createMembership({
              companyId: 2,
              isCompanyActive: true,
              subscriptionStatus: SubscriptionStatus.ACTIVE,
              endsAt: new Date(Date.now() + 86400000),
            }),
          ],
        },
        1,
      ),
    ).toThrow('This company subscription is no longer active.');
  });
});

function createMembership({
  companyId,
  isCompanyActive = true,
  lastAccessedAt = null,
  subscriptionStatus,
  endsAt = null,
  trialEndsAt = null,
}: {
  companyId: number;
  isCompanyActive?: boolean;
  lastAccessedAt?: Date | null;
  subscriptionStatus?: SubscriptionStatus;
  endsAt?: Date | null;
  trialEndsAt?: Date | null;
}) {
  return {
    companyId,
    companyRoleId: null,
    lastAccessedAt,
    role: MembershipRole.ADMIN,
    status: MembershipStatus.ACTIVE,
    company: {
      isActive: isCompanyActive,
      status: isCompanyActive ? CompanyStatus.ACTIVE : CompanyStatus.SUSPENDED,
      subscriptions: subscriptionStatus
        ? [
            {
              status: subscriptionStatus,
              trialEndsAt,
              endsAt,
            },
          ]
        : [],
    },
  };
}
