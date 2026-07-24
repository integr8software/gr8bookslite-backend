import { Prisma } from '@prisma/client';
import { TaxInclude } from '../prisma/tax.include';

export type TaxDetails = Prisma.TaxMaintenanceGetPayload<{
  include: typeof TaxInclude;
}>;
