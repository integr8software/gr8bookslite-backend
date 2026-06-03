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
      plan: true,
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
} satisfies Prisma.CompanyInclude;

export const WorkspaceCompanyDetailsInclude = {
  ...WorkspaceCompanyListInclude,
  units: {
    orderBy: [{ type: 'asc' }, { createdAt: 'asc' }],
  },
} satisfies Prisma.CompanyInclude;
