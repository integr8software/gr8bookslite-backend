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
} satisfies Prisma.CompanyInclude;

export const WorkspaceCompanyDetailsInclude = {
  ...WorkspaceCompanyListInclude,
  units: {
    orderBy: [{ type: 'asc' }, { createdAt: 'asc' }],
  },
} satisfies Prisma.CompanyInclude;
