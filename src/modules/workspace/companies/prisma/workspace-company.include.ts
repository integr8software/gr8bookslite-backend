import { CompanyUnitType, Prisma } from '@prisma/client';

export const WorkspaceCompanyListInclude = {
  _count: {
    select: {
      memberships: true,
      units: {
        where: {
          type: {
            in: [CompanyUnitType.BRANCH, CompanyUnitType.SATELLITE],
          },
        },
      },
    },
  },
  subscriptions: {
    take: 1,
    orderBy: {
      createdAt: 'desc',
    },
    include: {
      plan: {
        include: {
          prices: {
            where: {
              isActive: true,
            },
          },
        },
      },
    },
  },
  createdByUser: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
  units: {
    where: {
      isActive: true,
    },
    orderBy: [{ type: 'asc' }, { createdAt: 'asc' }],
  },
  roles: {
    where: {
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      code: true,
      unitId: true,
    },
    orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
  },
} satisfies Prisma.CompanyInclude;


export const WorkspaceCompanyDetailsInclude = {
  ...WorkspaceCompanyListInclude,
  units: {
    orderBy: [{ type: 'asc' }, { createdAt: 'asc' }],
  },
} satisfies Prisma.CompanyInclude;
