import { AccessScopeLevel, MembershipRole, MembershipStatus } from '@prisma/client';
import { materializeDefaultUserSidebar } from '../../src/modules/company/user-sidebar/user-sidebar.defaults';
import { prisma } from './prismaClient';

export async function seedUserSidebars() {
  const memberships = await prisma.membership.findMany({
    where: { status: MembershipStatus.ACTIVE },
    include: {
      company: {
        include: {
          units: { where: { isActive: true }, select: { id: true }, orderBy: { id: 'asc' } },
        },
      },
      unitAccess: { select: { unitId: true } },
    },
    orderBy: [{ companyId: 'asc' }, { userId: 'asc' }],
  });

  for (const membership of memberships) {
    const activeModules = await prisma.module.findMany({
      where: { isActive: true },
      select: { id: true },
    });
    await prisma.companyModule.createMany({
      data: activeModules.map((module) => ({
        companyId: membership.companyId,
        moduleId: module.id,
        isEnabled: true,
        enabledAt: new Date(),
      })),
      skipDuplicates: true,
    });

    const branchUnitIds =
      membership.role === MembershipRole.ADMIN ||
      membership.accessScope === AccessScopeLevel.COMPANY ||
      membership.unitAccess.length === 0
        ? membership.company.units.map((unit) => unit.id)
        : membership.unitAccess.map((unit) => unit.unitId);

    for (const branchUnitId of [...new Set(branchUnitIds)]) {
      await prisma.$transaction((tx) =>
        materializeDefaultUserSidebar(tx, membership.companyId, branchUnitId, membership.userId),
      );
    }
  }
}
