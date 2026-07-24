import { Prisma } from '@prisma/client';

export const TaxInclude = {
  rateVersions: {
    orderBy: {
      effectiveFrom: 'desc',
    },
  },
  postingRules: {
    orderBy: [{ priority: 'asc' }, { id: 'asc' }],
  },
} satisfies Prisma.TaxMaintenanceInclude;
