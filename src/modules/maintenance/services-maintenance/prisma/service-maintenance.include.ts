import { Prisma } from '@prisma/client';

export const ServiceMaintenanceInclude = {
  revenueCoa: true,
} satisfies Prisma.ServiceMaintenanceInclude;
