import {
  AccessScopeLevel,
  MembershipRole,
  MembershipStatus,
  Prisma,
} from '@prisma/client';
import { materializeDefaultUserSidebar } from '../../src/modules/company/user-sidebar/user-sidebar.defaults';
import { prisma } from './prismaClient';

const seedUserSidebarMembershipInclude =
  Prisma.validator<Prisma.MembershipInclude>()({
    company: {
      include: {
        subscriptions: {
          include: {
            plan: {
              include: {
                systems: {
                  where: {
                    isEnabled: true,
                    system: { isActive: true },
                  },
                  include: {
                    system: {
                      include: {
                        modules: {
                          where: {
                            isActive: true,
                            module: { isActive: true },
                          },
                          select: { moduleId: true },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          orderBy: [{ startsAt: 'desc' }, { createdAt: 'desc' }],
          take: 1,
        },
        units: {
          where: { isActive: true },
          select: { id: true },
          orderBy: { id: 'asc' },
        },
      },
    },
    unitAccess: { select: { unitId: true } },
  });

type SeedUserSidebarMembership = Prisma.MembershipGetPayload<{
  include: typeof seedUserSidebarMembershipInclude;
}>;

export async function seedUserSidebars() {
  const memberships = await prisma.membership.findMany({
    where: { status: MembershipStatus.ACTIVE },
    include: seedUserSidebarMembershipInclude,
    orderBy: [{ companyId: 'asc' }, { userId: 'asc' }],
  });

  for (const membership of memberships) {
    const planModuleIds = getLatestSubscriptionPlanModuleIds(membership);

    if (planModuleIds.length > 0) {
      await prisma.companyModule.createMany({
        data: planModuleIds.map((moduleId) => ({
          companyId: membership.companyId,
          moduleId,
          isEnabled: true,
          enabledAt: new Date(),
        })),
        skipDuplicates: true,
      });
    }

    const branchUnitIds =
      membership.role === MembershipRole.ADMIN ||
      membership.accessScope === AccessScopeLevel.COMPANY ||
      membership.unitAccess.length === 0
        ? membership.company.units.map((unit) => unit.id)
        : membership.unitAccess.map((unit) => unit.unitId);

    for (const branchUnitId of [...new Set(branchUnitIds)]) {
      await prisma.$transaction((tx) =>
        materializeDefaultUserSidebar(
          tx,
          membership.companyId,
          branchUnitId,
          membership.userId,
        ),
      );
    }
  }
}

function getLatestSubscriptionPlanModuleIds(
  membership: SeedUserSidebarMembership,
): number[] {
  const latestSubscription = membership.company.subscriptions[0];

  if (!latestSubscription) {
    return [];
  }

  return [
    ...new Set(
      latestSubscription.plan.systems.flatMap((planSystem) =>
        planSystem.system.modules.map((item) => item.moduleId),
      ),
    ),
  ];
}
