import { Prisma } from '@prisma/client';
import { TaxMaintenanceInclude } from '../prisma/tax-maintenance.include';

export type TaxMaintenanceWithAccounts = Prisma.TaxMaintenanceGetPayload<{
  include: typeof TaxMaintenanceInclude;
}>;
