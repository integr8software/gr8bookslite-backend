import { Prisma } from '@prisma/client';
import { WarehouseMaintenanceInclude } from '../prisma/warehouse-maintenance.include';

export type WarehouseMaintenanceWithBranches = Prisma.WarehouseGetPayload<{
  include: typeof WarehouseMaintenanceInclude;
}>;
