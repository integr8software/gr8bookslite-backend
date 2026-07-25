import { Prisma } from '@prisma/client';
import { ServiceMaintenanceInclude } from '../prisma/service-maintenance.include';
import type { PrismaService as AppPrismaService } from '../../../../prisma/prisma.service';

export type ServiceMaintenancePayload = Prisma.ServiceMaintenanceGetPayload<{
  include: typeof ServiceMaintenanceInclude;
}>;

export type ServicesMaintenancePrismaClient = Prisma.TransactionClient | AppPrismaService;
