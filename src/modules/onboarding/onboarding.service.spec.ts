import { BadRequestException } from '@nestjs/common';
import {
  BillingCycle,
  BillingProvider,
  CompanyStatus,
  MembershipRole,
  MembershipStatus,
  SubscriptionPlanScope,
  SubscriptionPlanStatus,
  SubscriptionStatus,
  TaxpayerType,
} from '@prisma/client';
import { AppRole } from '../../common/enums/app-role.enum';
import { OnboardingService } from './onboarding.service';
import { materializeDefaultUserSidebar } from '../company/user-sidebar/user-sidebar.defaults';

jest.mock('../company/user-sidebar/user-sidebar.defaults', () => ({
  materializeDefaultUserSidebar: jest.fn(),
}));

const completedAt = new Date('2026-07-03T00:00:00.000Z');

describe('OnboardingService phase 0 module entitlements', () => {
  const user = {
    id: 7,
    companyId: null,
    role: AppRole.USER,
    systemRole: 'STANDARD',
    membershipRole: null,
    membershipStatus: null,
    companyRoleId: null,
    companyRoleCode: null,
    companyRoleName: null,
    accessScope: null,
    enabledModules: [],
    permissions: [],
    userModules: { items: [], byBranch: [] },
  } as never;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(completedAt);
    jest.mocked(materializeDefaultUserSidebar).mockResolvedValue(false);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('enables only modules from the selected subscription plan systems when onboarding completes', async () => {
    const { service, tx } = createService();

    await service.complete(user);

    expect(tx.companyModule.upsert).toHaveBeenCalledTimes(2);
    expect(tx.companyModule.upsert).toHaveBeenNthCalledWith(1, {
      where: {
        companyId_moduleId: {
          companyId: 57,
          moduleId: 10,
        },
      },
      update: {
        isEnabled: true,
        enabledAt: completedAt,
        disabledAt: null,
      },
      create: {
        companyId: 57,
        moduleId: 10,
        isEnabled: true,
        enabledAt: completedAt,
      },
    });
    expect(tx.companyModule.upsert).toHaveBeenNthCalledWith(2, {
      where: {
        companyId_moduleId: {
          companyId: 57,
          moduleId: 11,
        },
      },
      update: {
        isEnabled: true,
        enabledAt: completedAt,
        disabledAt: null,
      },
      create: {
        companyId: 57,
        moduleId: 11,
        isEnabled: true,
        enabledAt: completedAt,
      },
    });
    expect(tx.companyModule.upsert).not.toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          companyId_moduleId: {
            companyId: 57,
            moduleId: 99,
          },
        },
      }),
    );
  });

  it('keeps module assignment idempotent by upserting company module rows', async () => {
    const { service, tx } = createService();

    await service.complete(user);

    for (const call of tx.companyModule.upsert.mock.calls) {
      expect(call[0].where).toHaveProperty('companyId_moduleId');
    }
    expect('createMany' in tx.companyModule).toBe(false);
  });

  it('fails clearly when the selected plan has no enabled modules configured', async () => {
    const { service, tx } = createService({
      draft: buildDraft({
        subscriptionPlan: buildPlan({
          systems: [],
        }),
      }),
    });

    await expect(service.complete(user)).rejects.toThrow(BadRequestException);
    expect(tx.companyModule.upsert).not.toHaveBeenCalled();
    expect(materializeDefaultUserSidebar).not.toHaveBeenCalled();
  });
});

function createService({
  draft = buildDraft(),
}: {
  draft?: ReturnType<typeof buildDraft>;
} = {}) {
  const tx = {
    company: {
      update: jest.fn().mockResolvedValue(buildCompany()),
    },
    membership: {
      upsert: jest.fn().mockResolvedValue({}),
    },
    companySubscription: {
      findFirst: jest.fn().mockResolvedValue(buildSubscription(draft)),
    },
    companyModule: {
      upsert: jest.fn().mockResolvedValue({}),
    },
    companyUnit: {
      findFirst: jest.fn().mockResolvedValue({ id: 70 }),
    },
    userOnboardingDraft: {
      delete: jest.fn().mockResolvedValue({}),
    },
  };

  const prisma = {
    userOnboardingDraft: {
      findUnique: jest.fn().mockResolvedValue(draft),
    },
    $transaction: jest.fn(
      (callback: (txClient: typeof tx) => Promise<unknown>) => callback(tx),
    ),
    user: {
      findUnique: jest.fn().mockResolvedValue({
        email: 'owner@example.com',
        name: 'Owner User',
      }),
    },
  };

  const service = new OnboardingService(
    prisma as never,
    {} as never,
    {
      moveLogo: jest.fn(),
    } as never,
    {
      sign: jest.fn().mockReturnValue('signed-token'),
    } as never,
    {
      sendOnboardingCongratulations: jest.fn().mockResolvedValue(undefined),
    } as never,
  );

  return { service, tx, prisma };
}

function buildDraft({
  subscriptionPlan = buildPlan(),
}: {
  subscriptionPlan?: ReturnType<typeof buildPlan>;
} = {}) {
  return {
    userId: 7,
    subscriptionPlanId: subscriptionPlan.id,
    subscriptionPlan,
    billingCycle: BillingCycle.MONTHLY,
    billingCompletedAt: completedAt,
    companyDetailsCompletedAt: completedAt,
    taxpayerType: TaxpayerType.NON_INDIVIDUAL,
    provisionedCompanyId: 57,
    logoStoragePath: null,
  };
}

function buildPlan({
  systems = [
    buildPlanSystem({
      systemId: 1,
      modules: [buildSystemModule(10), buildSystemModule(11)],
    }),
    buildPlanSystem({
      systemId: 2,
      isEnabled: false,
      modules: [buildSystemModule(99)],
    }),
  ],
}: {
  systems?: ReturnType<typeof buildPlanSystem>[];
} = {}) {
  return {
    id: 3,
    code: 'ACCOUNTING',
    name: 'Accounting',
    description: 'Accounting plan',
    currency: 'PHP',
    billingProvider: BillingProvider.PAYMONGO,
    billingMetadata: null,
    scope: SubscriptionPlanScope.ONBOARDING,
    status: SubscriptionPlanStatus.ACTIVE,
    trialDays: 15,
    isActive: true,
    createdAt: completedAt,
    updatedAt: completedAt,
    prices: [],
    usageRules: [],
    discountTiers: [],
    modules: [],
    systems,
  };
}

function buildPlanSystem({
  systemId,
  isEnabled = true,
  modules,
}: {
  systemId: number;
  isEnabled?: boolean;
  modules: ReturnType<typeof buildSystemModule>[];
}) {
  return {
    id: systemId,
    subscriptionPlanId: 3,
    systemId,
    isEnabled,
    createdAt: completedAt,
    updatedAt: completedAt,
    system: {
      id: systemId,
      code: `SYSTEM_${systemId}`,
      name: `System ${systemId}`,
      description: null,
      sortOrder: systemId,
      isActive: true,
      createdAt: completedAt,
      updatedAt: completedAt,
      modules,
    },
  };
}

function buildSystemModule(moduleId: number) {
  return {
    id: moduleId,
    systemId: 1,
    moduleId,
    sortOrder: moduleId,
    isActive: true,
    createdAt: completedAt,
    updatedAt: completedAt,
    module: {
      id: moduleId,
      code: `MODULE_${moduleId}`,
      name: `Module ${moduleId}`,
      description: null,
      icon: null,
      category: 'STANDARD',
      type: [],
      isActive: true,
      createdAt: completedAt,
      updatedAt: completedAt,
    },
  };
}

function buildCompany() {
  return {
    id: 57,
    name: 'New Company',
    slug: 'new-company',
    status: CompanyStatus.ACTIVE,
  };
}

function buildSubscription(draft: ReturnType<typeof buildDraft>) {
  return {
    id: 12,
    companyId: 57,
    subscriptionPlanId: draft.subscriptionPlanId,
    billingCycle: draft.billingCycle,
    status: SubscriptionStatus.TRIALING,
    startsAt: completedAt,
    trialEndsAt: completedAt,
    plan: draft.subscriptionPlan,
  };
}
