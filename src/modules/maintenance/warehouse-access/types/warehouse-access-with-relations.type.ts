import { Prisma } from '@prisma/client';
import { WarehouseAccessInclude } from '../prisma/warehouse-access.include';

export type WarehouseAccessWithRelations = Prisma.WarehouseAccessGetPayload<{
  include: typeof WarehouseAccessInclude;
}>;
